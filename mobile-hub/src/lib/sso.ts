import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { env } from "@/env";
import { supabase } from "@/lib/supabase";
import { isNative, platform } from "@/lib/native";

/**
 * Đăng nhập Arex Hub bằng trình duyệt hệ thống (SSO).
 *
 * Nhập email/mật khẩu ngay trong app hay hỏng: tài khoản đăng ký bằng
 * Google/Discord thì không có mật khẩu, mà OAuth trong WebView lại bị Google
 * chặn. Nên app mở `arexnetwork.site/auth/hub` bằng trình duyệt thật — nơi
 * người dùng thường đã đăng nhập sẵn — rồi website đá ngược về deep link
 * `arexhub://sso?grant=…`.
 *
 * Vé trong deep link KHÔNG phải token: muốn đổi thành phiên thật phải POST kèm
 * `verifier` chỉ app này biết (PKCE). App khác chặn được deep link cũng vô ích.
 * Xem `src/lib/server/hub-sso.ts` bên web để biết đầu kia.
 */

const VERIFIER_KEY = "arex-hub-sso-verifier";

/** Deep link app nhận về; phải khớp AndroidManifest.xml + Info.plist. */
export const SSO_SCHEME = "arexhub";

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function randomVerifier(length = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += B64URL[byte % B64URL.length];
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * SHA-256 thuần JS — dự phòng cho WebView không có `crypto.subtle`.
 *
 * iOS chạy ở origin `capacitor://localhost`; tuỳ phiên bản WKWebView mà origin
 * này không được coi là secure context, khi đó `crypto.subtle` là undefined và
 * cả luồng PKCE sập. Thà thêm 40 dòng còn hơn mất đường đăng nhập.
 */
function sha256Fallback(input: string): Uint8Array {
  const message = new TextEncoder().encode(input);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const padded = new Uint8Array((((message.length + 8) >> 6) + 1) << 6);
  padded.set(message);
  padded[message.length] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLength = message.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 4294967296));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a0 = w[i - 15];
      const a1 = w[i - 2];
      const s0 = rotr(a0, 7) ^ rotr(a0, 18) ^ (a0 >>> 3);
      const s1 = rotr(a1, 17) ^ rotr(a1, 19) ^ (a1 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    const round = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + round[i]) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

async function challengeFor(verifier: string): Promise<string> {
  if (crypto?.subtle?.digest) {
    const digest = await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(verifier))
      .catch(() => null);
    if (digest) return bytesToB64url(new Uint8Array(digest));
  }
  return bytesToB64url(sha256Fallback(verifier));
}

/** Bước 1: sinh cặp verifier/challenge rồi mở trang đăng nhập bằng trình duyệt. */
export async function startHubSso(): Promise<void> {
  const verifier = randomVerifier();
  await Preferences.set({ key: VERIFIER_KEY, value: verifier });

  const url = `${env.apiBaseUrl}/auth/hub?c=${encodeURIComponent(await challengeFor(verifier))}&p=${platform}`;

  if (!isNative) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Browser.open({ url, presentationStyle: "fullscreen" });
}

/** Deep link này có phải vé SSO không. */
function grantFromUrl(raw: string): string | null {
  try {
    // `new URL` xử lý được scheme lạ, nhưng phần sau `://` thì mỗi nền tảng một
    // kiểu — bắt trực tiếp query cho chắc.
    const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
    if (!raw.toLowerCase().startsWith(`${SSO_SCHEME}://sso`)) return null;
    return new URLSearchParams(query).get("grant");
  } catch {
    return null;
  }
}

/** Bước 4: đổi vé lấy phiên Supabase thật. Ném lỗi tiếng Việt khi thất bại. */
export async function completeHubSso(rawUrl: string): Promise<boolean> {
  const grant = grantFromUrl(rawUrl);
  if (!grant) return false;

  const { value: verifier } = await Preferences.get({ key: VERIFIER_KEY });
  if (!verifier) {
    throw new Error("Không tìm thấy mã xác thực của thiết bị — hãy bấm đăng nhập lại từ app.");
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/api/auth/hub-sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ grant, verifier }),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.");
  }

  const data = (await response.json().catch(() => ({}))) as {
    tokenHash?: string;
    error?: string;
  };

  if (!response.ok || !data.tokenHash) {
    throw new Error(data.error ?? `Đăng nhập thất bại (${response.status}).`);
  }

  // Vé đã dùng xong — xoá để không đổi lại được lần hai.
  await Preferences.remove({ key: VERIFIER_KEY });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: data.tokenHash,
    type: "magiclink",
  });
  if (error) throw new Error(`Không tạo được phiên đăng nhập: ${error.message}`);

  // AuthProvider nghe onAuthStateChange nên tới đây là app tự vào trong.
  await Browser.close().catch(() => null);
  return true;
}

/**
 * Lắng nghe deep link SSO — gắn một lần lúc app khởi động.
 *
 * Bao gồm cả trường hợp app đang tắt hẳn và được chính deep link đánh thức
 * (`getLaunchUrl`), lúc đó listener gắn sau nên không bắt được sự kiện.
 */
export function listenHubSso(handlers: {
  /** Đã nhận vé, đang đổi lấy phiên — để UI giữ trạng thái đang chạy. */
  onExchange?: () => void;
  onError: (message: string) => void;
}): () => void {
  let disposed = false;

  const handle = async (url: string) => {
    if (!grantFromUrl(url)) return;
    handlers.onExchange?.();
    try {
      await completeHubSso(url);
    } catch (error) {
      if (!disposed) handlers.onError((error as Error).message);
    }
  };

  if (!isNative) return () => {};

  void App.getLaunchUrl()
    .then((launch) => {
      if (launch?.url) void handle(launch.url);
    })
    .catch(() => null);

  const listener = App.addListener("appUrlOpen", ({ url }) => void handle(url));

  return () => {
    disposed = true;
    void listener.then((h) => h.remove()).catch(() => null);
  };
}
