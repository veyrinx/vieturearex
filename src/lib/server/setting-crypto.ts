/**
 * Transparent AES-256-GCM encryption for sensitive setting values.
 * Encrypted values are stored with the prefix "enc:" in the database.
 * Decryption happens automatically in getSettings(); callers see plain text.
 *
 * Keys in SENSITIVE_KEYS are auto-encrypted on write and decrypted on read.
 * Add new keys here — no other code changes needed.
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
  "ads.google_adsense_id",
  "ads.slot_header",
  "ads.slot_sidebar",
  "ads.slot_article",
  "integrations.lark_webhook_url",
  "integrations.lark_alerts_webhook_url",
  "integrations.telegram_bot_token",
  "integrations.telegram_chat_id",
  "tms.payment_info",
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
  return crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64url(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromb64url(s: string): ArrayBuffer {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)),
    (c) => c.charCodeAt(0),
  ).buffer as ArrayBuffer;
}

/** Encrypt a plain value → "enc:<iv>.<ciphertext>" */
export async function encryptSetting(plain: string): Promise<string> {
  if (!plain) return plain;
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(iv);
  const key = await importAesKey();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${ENC_PREFIX}${b64url(iv.buffer as ArrayBuffer)}.${b64url(ct)}`;
}

/** Decrypt an "enc:..." value → plain string. Returns value unchanged if not encrypted. */
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
    return stored;
  }
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
