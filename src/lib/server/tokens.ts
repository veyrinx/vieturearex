/**
 * Edge-compatible JWT-style token utility (Web Crypto API — no dependencies).
 *
 * signToken / verifyToken  — HMAC-SHA256 signed compact token (HS256 JWT format)
 * sealToken / openToken   — AES-256-GCM encrypted token (payload is opaque to client)
 *
 * Required env var:
 *   APP_SECRET — at least 32 random characters. Falls back to NEXT_REDIRECT_SECRET
 *   for local dev. Generate with: openssl rand -base64 32
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromb64url(s: string): Uint8Array {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)),
    (c) => c.charCodeAt(0),
  );
}

function getSecret(): string {
  return process.env.APP_SECRET ?? process.env.NEXT_REDIRECT_SECRET ?? "arex-dev-fallback-change-in-production";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret() + ":sign"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function aesKey(): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret() + ":enc"),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("arex-aes-v1"), info: new Uint8Array() },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type TokenPayload = Record<string, unknown> & {
  exp?: number; // Unix timestamp (seconds)
  iat?: number;
};

const HEADER = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));

// ── Signed tokens (HS256 JWT) ──────────────────────────────────────────────────

/**
 * Create a signed token. Default TTL = 7 days.
 * Result is URL-safe (no padding, uses - and _).
 */
export async function signToken(payload: TokenPayload, ttlSecs = 7 * 24 * 3600): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: TokenPayload = { ...payload, iat: now, exp: now + ttlSecs };
  const body = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${HEADER}.${body}`));
  return `${HEADER}.${body}.${b64url(sig)}`;
}

/**
 * Verify a signed token. Returns decoded payload or null if invalid/expired.
 */
export async function verifyToken<T extends TokenPayload = TokenPayload>(token: string): Promise<T | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key = await hmacKey();
    const sigRaw = fromb64url(sig);
    const sigBuf = sigRaw.buffer.slice(sigRaw.byteOffset, sigRaw.byteOffset + sigRaw.byteLength) as ArrayBuffer;
    const ok = await crypto.subtle.verify("HMAC", key, sigBuf, new TextEncoder().encode(`${header}.${body}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromb64url(body))) as T;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Encrypted tokens (AES-256-GCM) ────────────────────────────────────────────

/**
 * Encrypt and authenticate a payload. Payload is NOT visible to the client.
 * Format: base64url(iv) + "." + base64url(ciphertext+tag)
 * Default TTL = 7 days.
 */
export async function sealToken(payload: TokenPayload, ttlSecs = 7 * 24 * 3600): Promise<string> {
  const claims: TokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSecs };
  const ivArr = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(ivArr);
  const iv = ivArr;
  const key = await aesKey();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  return `${b64url(iv)}.${b64url(ct)}`;
}

/**
 * Decrypt a sealed token. Returns payload or null if tampered/expired.
 */
export async function openToken<T extends TokenPayload = TokenPayload>(token: string): Promise<T | null> {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return null;
    const ivPart = token.slice(0, dot);
    const ctPart = token.slice(dot + 1);
    const key = await aesKey();
    const ivRaw = fromb64url(ivPart);
    const ivBuf = ivRaw.buffer.slice(ivRaw.byteOffset, ivRaw.byteOffset + ivRaw.byteLength) as ArrayBuffer;
    const ctRaw = fromb64url(ctPart);
    const ctBuf = ctRaw.buffer.slice(ctRaw.byteOffset, ctRaw.byteOffset + ctRaw.byteLength) as ArrayBuffer;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, ctBuf);
    const payload = JSON.parse(new TextDecoder().decode(plain)) as T;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
