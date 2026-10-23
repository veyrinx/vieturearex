/**
 * Setting nhạy cảm KHÔNG còn mã hoá khi ghi — lưu dạng rõ, không phụ thuộc
 * APP_SECRET. SENSITIVE_KEYS vẫn dùng để che giá trị khỏi API admin.
 *
 * Giá trị cũ dạng "enc:<iv>.<ciphertext>" vẫn được giải mã khi đọc nếu khoá
 * khớp; chạy POST /api/admin/settings/migrate-decrypt một lần (trên môi trường
 * có đúng APP_SECRET) để chuyển hết về dạng rõ.
 */

const ENC_PREFIX = "enc:";

export const SENSITIVE_KEYS = new Set([
  "mail.smtp_pass",
  "mail.smtp_user",
  "mail.smtp_host",
  "mail.from_email",
  "site.discord_webhook",
  "zalo.webhook_url",
  "zalo.group_id",
  "zalo.oa_access_token",
  "zalo.recipient_user_id",
  "ads.google_adsense_id",
  "ads.slot_header",
  "ads.slot_sidebar",
  "ads.slot_article",
  "integrations.lark_webhook_url",
  "integrations.lark_alerts_webhook_url",
  "integrations.telegram_bot_token",
  "integrations.zalo_bot_token",
  "integrations.zalo_bot_webhook_secret",
  "integrations.telegram_chat_id",
  "integrations.telegram_user_bot_token",
  "integrations.telegram_user_chat_id",
  "integrations.discord_bot_token",
  "integrations.firebase_private_key",
  // Trước đây chỉ có trong SENSITIVE_FORM_KEYS → lưu dạng rõ và GET /api/admin/settings
  // trả nguyên giá trị về trình duyệt. Hai danh sách phải luôn khớp nhau.
  "integrations.ai_api_key",
  "integrations.discord_internal_webhook",
  "integrations.discord_public_webhook",
  "integrations.lark_app_id",
  "integrations.lark_app_secret",
  "integrations.lark_sheet_token",
  "tms.payment_info",
  "push.vapid_private_key",
  "streams.youtube_api_key",
]);

function getSecret(): Uint8Array {
  const s = process.env.APP_SECRET ?? process.env.NEXT_REDIRECT_SECRET ?? "arex-dev-fallback-change-in-production";
  // Derive 32-byte key from secret
  const src = (s + ":setting-enc").slice(0, 256);
  const enc = new TextEncoder().encode(src);
  const key = new Uint8Array(32);
  for (let i = 0; i < enc.length; i++) key[i % 32] ^= enc[i];
  return key;
}

async function importAesKey(): Promise<CryptoKey> {
  const raw = getSecret();
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  return crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, false, ["decrypt"]);
}

function fromb64url(s: string): ArrayBuffer {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)),
    (c) => c.charCodeAt(0),
  ).buffer as ArrayBuffer;
}

let warnedDecrypt = false;

/** Decrypt a legacy "enc:..." value → plain string. Returns value unchanged if not encrypted. */
export async function decryptSetting(stored: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const inner = stored.slice(ENC_PREFIX.length);
    const dot = inner.indexOf(".");
    if (dot === -1) return stored;
    const iv = fromb64url(inner.slice(0, dot));
    const ct = fromb64url(inner.slice(dot + 1));
    const key = await importAesKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    // Giải mã hỏng gần như luôn là APP_SECRET khác lúc lưu (thiếu biến môi
    // trường, hoặc vừa đổi). Trả lại nguyên chuỗi "enc:…" thì bên gọi cứ thế
    // đem đi làm token — Telegram/Discord im lặng trả lỗi, không ai biết vì sao.
    // Kêu ra log một lần để còn lần được — nhập lại giá trị trong admin là xong.
    if (!warnedDecrypt) {
      warnedDecrypt = true;
      console.warn("[settings] Có giá trị \"enc:\" cũ không giải mã được — nhập lại trong Cài đặt.");
    }
    return stored;
  }
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
