/**
 * Chốt chống flood — thứ chặn được đợt tấn công đến từ HÀNG TRĂM IP.
 *
 * Chặn theo IP (xem `ip-block.ts`) chỉ trị được một kẻ ngồi spam. Một đợt DDoS
 * thật thì mỗi IP chỉ gửi vài request, danh sách chặn không bao giờ đuổi kịp.
 * Cái đo được ở đây là TỔNG lưu lượng: khi số request mỗi giây vọt qua mức
 * bình thường, site tự vào "chế độ phòng thủ" và trả 429 rẻ tiền cho khách vãng
 * lai ngay tại middleware — không render trang, không hỏi Supabase, không tính
 * tiền hàm.
 *
 * Người đã đăng nhập vẫn đi bình thường: kẻ tấn công gần như không bao giờ cầm
 * cookie phiên hợp lệ, còn người dùng thật thì đang giữa chừng công việc.
 *
 * ⚠️ Đây là lớp cuối cùng, KHÔNG phải lớp đầu. Request đã tới được middleware
 * nghĩa là đã tốn băng thông và một lượt gọi hàm. Chặn đúng chỗ là ở biên
 * (Cloudflare / Vercel Firewall). Chốt này để site còn đứng được trong lúc
 * người trực kịp bật luật ở biên.
 */

export const SETTINGS_KEY_FLOOD_GUARD = "security.flood_guard";

export type FloodGuardMode =
  /** Tự phát hiện theo lưu lượng (mặc định). */
  | "auto"
  /** Ép bật — dùng khi đang bị đánh mà chưa kịp chỉnh ngưỡng. */
  | "on"
  /** Tắt hẳn. */
  | "off";

export type FloodGuardConfig = {
  mode: FloodGuardMode;
  /** Số request một máy chịu trong `windowMs` trước khi coi là bị đánh. */
  threshold: number;
  windowMs: number;
  /** Vào chế độ phòng thủ rồi thì giữ bao lâu sau nhịp cuối vượt ngưỡng. */
  holdMs: number;
};

/**
 * Mặc định cố tình rộng tay. Một đợt tin nóng cũng đẩy lưu lượng lên cao, mà
 * chặn nhầm người đọc thật thì tệ hơn là chịu thêm vài trăm request rác.
 */
export const DEFAULT_FLOOD_GUARD: FloodGuardConfig = {
  mode: "auto",
  threshold: 600,
  windowMs: 10_000,
  holdMs: 60_000,
};

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export function parseFloodGuard(raw: string | null | undefined): FloodGuardConfig {
  if (!raw) return DEFAULT_FLOOD_GUARD;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const mode = o.mode === "on" || o.mode === "off" ? o.mode : "auto";
    return {
      mode,
      threshold: clampInt(o.threshold, 50, 100_000, DEFAULT_FLOOD_GUARD.threshold),
      windowMs: clampInt(o.windowMs, 1_000, 300_000, DEFAULT_FLOOD_GUARD.windowMs),
      holdMs: clampInt(o.holdMs, 5_000, 3_600_000, DEFAULT_FLOOD_GUARD.holdMs),
    };
  } catch {
    return DEFAULT_FLOOD_GUARD;
  }
}

/**
 * Đường không bao giờ bị chốt flood chặn, kể cả giữa đợt tấn công:
 * - `/api/health`, `/api/cron`: giám sát và việc định kỳ.
 * - `/login`, `/register`, `/auth`: người thật đang cần đăng nhập để thoát khỏi
 *   diện "khách vãng lai" — chặn ở đây là khoá luôn đường thoát.
 * - `/updating`, `/maintenance`: trang thông báo.
 */
const FLOOD_SKIP_PREFIXES = [
  "/api/health",
  "/api/cron",
  "/auth",
  "/login",
  "/register",
  "/updating",
  "/maintenance",
];

export const shouldSkipFloodGuard = (pathname: string): boolean =>
  FLOOD_SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

/**
 * Có cookie phiên Supabase không. Chỉ nhìn tên cookie, KHÔNG xác thực — xác
 * thực là một vòng gọi mạng, mà giữa đợt flood thì mỗi vòng gọi là một mũi dao
 * đâm vào chính mình. Cookie giả chỉ mua được quyền đi tiếp tới lớp chặn thật
 * phía sau, không mua được dữ liệu nào.
 */
export const looksAuthenticated = (cookieNames: string[]): boolean =>
  cookieNames.some((n) => n.startsWith("sb-") && n.includes("auth-token"));
