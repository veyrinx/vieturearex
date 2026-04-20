/**
 * Edge-compatible (Web Crypto API) HMAC sign/verify for redirect destination cookie.
 * Destination path is stored in an HTTP-only signed cookie — never exposed in the URL.
 */

const COOKIE_NAME = "__arex_dst";
const MAX_AGE_MS = 10 * 60 * 1000; // 10 min

function toB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)), (c) =>
    c.charCodeAt(0),
  );
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = (
    process.env.NEXT_REDIRECT_SECRET ??
    "arex-dev-change-this-secret-in-production"
  ).slice(0, 64);
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Sign a path → opaque cookie value. */
export async function signRedirectCookie(path: string): Promise<string> {
  const key = await hmacKey();
  const ts = Date.now().toString(36);
  const encoded = toB64url(new TextEncoder().encode(path));
  const payload = `${encoded}.${ts}`;
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sig = toB64url(sigBuf);
  return `${payload}.${sig}`;
}

/** Verify + extract the signed path. Returns fallback on any failure. */
export async function verifyRedirectCookie(token: string, fallback = "/admin"): Promise<string> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return fallback;
    const [encoded, ts, sig] = parts;
    const payload = `${encoded}.${ts}`;
    const key = await hmacKey();
    const sigBytes = fromB64url(sig);
    const payloadBytes = new TextEncoder().encode(payload);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes.buffer as ArrayBuffer, payloadBytes);
    if (!valid) return fallback;
    if (Date.now() - parseInt(ts, 36) > MAX_AGE_MS) return fallback;
    const path = new TextDecoder().decode(fromB64url(encoded));
    return path.startsWith("/") && !path.includes("//") && !path.includes(":") ? path : fallback;
  } catch {
    return fallback;
  }
}

export { COOKIE_NAME };
