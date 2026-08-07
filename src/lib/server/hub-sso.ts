/**
 * Vé SSO cho app Arex Hub (mobile-hub/).
 *
 * App native không dùng được cookie phiên của website, mà nhập email/mật khẩu
 * ngay trong app thì hay hỏng (tài khoản đăng ký bằng Google chưa có mật khẩu,
 * WebView bị chặn OAuth…). Thay vào đó app mở `/auth/hub` bằng TRÌNH DUYỆT HỆ
 * THỐNG — nơi người dùng đã đăng nhập sẵn hoặc đăng nhập bình thường — rồi
 * website đá ngược về app một "vé" đã ký qua deep link `arexhub://sso`.
 *
 * Vé KHÔNG chứa token Supabase: nó chỉ là chữ ký HMAC của {user, email, vai
 * trò, hạn dùng, challenge}. App phải POST kèm `verifier` (PKCE) mới đổi được
 * vé lấy phiên thật — nên app độc hại có chặn được deep link cũng vô dụng vì
 * không biết verifier.
 */

/** Vé sống ngắn: đủ để chuyển từ trình duyệt về app, không hơn. */
const GRANT_TTL_MS = 3 * 60 * 1000;

/** Scheme deep link của app Arex Hub (khác `arex://` của app Arex Network). */
export const HUB_SCHEME = "arexhub";

export type HubGrant = {
  /** user id */
  sub: string;
  email: string;
  role: string;
  /** base64url(sha256(verifier)) do app sinh ra */
  ch: string;
  /** hạn dùng, epoch ms */
  exp: number;
};

function toB64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(value: string): Uint8Array {
  const pad = value.length % 4 ? 4 - (value.length % 4) : 0;
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)),
    (c) => c.charCodeAt(0),
  );
}

export async function sha256B64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toB64url(new Uint8Array(digest));
}

/**
 * Khoá HMAC. Không thêm biến môi trường mới: lấy secret sẵn có rồi băm kèm nhãn
 * riêng, để khoá ký vé không trùng với khoá dùng cho việc khác.
 */
let cachedKey: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = (async () => {
      const source =
        process.env.HUB_SSO_SECRET ??
        process.env.NEXT_REDIRECT_SECRET ??
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SECRET_KEY ??
        "arex-hub-sso-dev-secret";
      const material = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${source}|arex-hub-sso|v1`),
      );
      return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
        "verify",
      ]);
    })();
  }
  return cachedKey;
}

/** Challenge hợp lệ: chuỗi base64url độ dài vừa phải (chống nhồi URL rác). */
export function isValidChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export async function signHubGrant(
  payload: Omit<HubGrant, "exp"> & { exp?: number },
): Promise<{ token: string; expiresAt: number }> {
  const grant: HubGrant = { ...payload, exp: payload.exp ?? Date.now() + GRANT_TTL_MS };
  const body = toB64url(new TextEncoder().encode(JSON.stringify(grant)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(body),
  );
  return { token: `${body}.${toB64url(new Uint8Array(sig))}`, expiresAt: grant.exp };
}

/** Trả về vé khi chữ ký đúng và còn hạn, ngược lại null. */
export async function verifyHubGrant(token: unknown): Promise<HubGrant | null> {
  if (typeof token !== "string" || token.length > 2048) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;

    const sigBytes = fromB64url(sig);
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(body),
    );
    if (!valid) return null;

    const grant = JSON.parse(new TextDecoder().decode(fromB64url(body))) as HubGrant;
    if (!grant?.sub || !grant?.email || !grant?.ch) return null;
    if (typeof grant.exp !== "number" || Date.now() > grant.exp) return null;
    return grant;
  } catch {
    return null;
  }
}

/** `arexhub://sso?grant=…` — đích đến của trình duyệt sau khi ký vé. */
export function hubDeepLink(token: string): string {
  return `${HUB_SCHEME}://sso?grant=${encodeURIComponent(token)}`;
}
