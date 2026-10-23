/**
 * Setting nhạy cảm KHÔNG còn mã hoá khi ghi — lưu dạng rõ, không phụ thuộc
 * APP_SECRET. SENSITIVE_KEYS vẫn dùng để che giá trị khỏi API admin.
 *
 * Giá trị cũ dạng "enc:<iv>.<ciphertext>" được giải mã khi đọc nếu một trong
 * các khoá đang có khớp, rồi getSettings() ghi lại dạng rõ (openSensitiveRows).
 */

const ENC_PREFIX = "enc:";

// Phải khớp với public.is_sensitive_setting_key (supabase/schema.sql) — RLS dựa
// vào đó để chặn user thường đọc các key này.
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

const FALLBACK_SECRET = "arex-dev-fallback-change-in-production";

// Mỗi bản triển khai (Vercel arexnetwork, Netlify iscnetwork) từng mã hoá bằng
// khoá của chính nó, kể cả khoá mặc định khi thiếu biến — chung một DB nên giá
// trị bên này lưu thì bên kia không mở được. Thử hết các khoá mình đang có.
function candidateSecrets(): string[] {
  const list = [process.env.APP_SECRET, process.env.NEXT_REDIRECT_SECRET, FALLBACK_SECRET];
  return [...new Set(list.filter((s): s is string => Boolean(s)))];
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const src = new TextEncoder().encode((secret + ":setting-enc").slice(0, 256));
  const raw = new Uint8Array(32);
  for (let i = 0; i < src.length; i++) raw[i % 32] ^= src[i];
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM" }, false, ["decrypt"]);
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
  const inner = stored.slice(ENC_PREFIX.length);
  const dot = inner.indexOf(".");
  if (dot === -1) return stored;
  let iv: ArrayBuffer, ct: ArrayBuffer;
  try {
    iv = fromb64url(inner.slice(0, dot));
    ct = fromb64url(inner.slice(dot + 1));
  } catch {
    return stored;
  }
  for (const secret of candidateSecrets()) {
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await importAesKey(secret), ct);
      return new TextDecoder().decode(plain);
    } catch {
      // khoá này không khớp — thử khoá tiếp
    }
  }
  // Không khoá nào mở được: giá trị do bản triển khai khác mã hoá. Trả lại
  // nguyên "enc:…" (bên gọi coi như chưa cấu hình); bản kia đọc tới sẽ tự
  // chuyển nó về dạng rõ. Kêu ra log một lần để còn lần được.
  if (!warnedDecrypt) {
    warnedDecrypt = true;
    console.warn("[settings] Có giá trị \"enc:\" cũ không giải mã được bằng khoá ở đây — mở trang trên site còn lại, hoặc nhập lại trong Cài đặt.");
  }
  return stored;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
