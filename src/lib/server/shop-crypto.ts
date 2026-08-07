import "server-only";

/**
 * Mã hoá thông tin bàn giao của chợ (tài khoản / mật khẩu game) trước khi ghi
 * xuống `shop_order_events.secret`.
 *
 * Lý do: cột này là thứ đáng giá nhất trong cả cái chợ. Nếu ai đó cầm được bản
 * dump DB, hay một truy vấn nào đó lỡ trả nhầm cột, thì thứ họ thấy phải là
 * chuỗi vô nghĩa chứ không phải mật khẩu. Khoá nằm ở biến môi trường, không
 * nằm trong DB — lộ DB thôi thì chưa giải được.
 *
 * Cùng thuật toán AES-256-GCM với `setting-crypto.ts`, nhưng nhãn dẫn xuất
 * khoá khác nên hai nơi không dùng chung khoá.
 */

type SecretMap = Record<string, string>;

/** Bọc ngoài khi lưu xuống jsonb: `{ v: 1, enc: "<iv>.<ct>" }` */
type SecretEnvelope = { v: 1; enc: string };

function isEnvelope(value: unknown): value is SecretEnvelope {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as SecretEnvelope).enc === "string" &&
    (value as SecretEnvelope).v === 1
  );
}

function deriveKeyBytes(): Uint8Array {
  const source =
    process.env.SHOP_SECRET_KEY ??
    process.env.APP_SECRET ??
    process.env.NEXT_REDIRECT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "arex-shop-dev-fallback-change-in-production";
  const enc = new TextEncoder().encode(`${source}:shop-secret-v1`.slice(0, 256));
  const key = new Uint8Array(32);
  for (let i = 0; i < enc.length; i++) key[i % 32] ^= enc[i];
  return key;
}

let cachedKey: Promise<CryptoKey> | null = null;
function aesKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const raw = deriveKeyBytes();
    const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    cachedKey = crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }
  return cachedKey;
}

function b64url(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(s: string): ArrayBuffer {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)),
    (c) => c.charCodeAt(0),
  ).buffer as ArrayBuffer;
}

/** Bản ghi để lưu xuống DB. `null` vào thì `null` ra. */
export async function encryptSecret(plain: SecretMap | null | undefined): Promise<SecretEnvelope | null> {
  if (!plain || Object.keys(plain).length === 0) return null;
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(),
    new TextEncoder().encode(JSON.stringify(plain)),
  );
  return { v: 1, enc: `${b64url(iv.buffer as ArrayBuffer)}.${b64url(ct)}` };
}

/**
 * Giải mã bản ghi đọc từ DB. Dữ liệu cũ lưu dạng phẳng (chưa mã hoá) vẫn đọc
 * được để không gãy đơn đang chạy; giải mã hỏng thì trả `null` chứ không ném.
 */
export async function decryptSecret(stored: unknown): Promise<SecretMap | null> {
  if (!stored || typeof stored !== "object") return null;

  if (!isEnvelope(stored)) {
    // Bản ghi cũ: object phẳng {username, password, …}
    const entries = Object.entries(stored as Record<string, unknown>).filter(
      ([, v]) => typeof v === "string",
    ) as [string, string][];
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  try {
    const dot = stored.enc.indexOf(".");
    if (dot === -1) return null;
    const iv = fromB64url(stored.enc.slice(0, dot));
    const ct = fromB64url(stored.enc.slice(dot + 1));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(), ct);
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
    ) as SecretMap;
  } catch {
    return null;
  }
}

export type { SecretMap };
