/**
 * Chuyển hướng nhanh sang máy chủ dự phòng.
 *
 * Site chạy song song hai nơi: bản trên Vercel và bản tự dựng. Khi một bên
 * hỏng, đổi DNS mất hàng chục phút tới vài giờ mới lan hết. Công tắc này đẩy
 * khách sang bên còn sống ngay lập tức, bật/tắt trong /admin/chuyen-huong,
 * không cần build lại.
 *
 * File chỉ chứa kiểu và hàm thuần để middleware, API và giao diện dùng chung
 * một bộ luật — lệch nhau một chỗ là sinh vòng lặp chuyển hướng.
 */

export const SETTINGS_KEY_FAILOVER = "site.failover";

export type FailoverConfig = {
  enabled: boolean;
  /** Gốc máy chủ nhận khách, vd "https://vieturearex.vercel.app". */
  target: string;
  /** Ghi lại ai bật và lúc nào, để lúc rối còn biết đường hỏi. */
  updatedAt?: string;
  updatedBy?: string;
  note?: string;
};

export const DEFAULT_FAILOVER: FailoverConfig = { enabled: false, target: "" };

/**
 * Những đường không bao giờ bị đẩy đi:
 * - /api/health: nơi giám sát hỏi "máy này còn sống không". Đẩy đi là mọi công
 *   cụ theo dõi đều thấy máy dự phòng khoẻ và tưởng máy chính cũng khoẻ.
 * - /api/cron: việc định kỳ phải chạy đúng trên máy được gọi, đẩy sang máy kia
 *   là chạy hai lần hoặc không lần nào.
 * - /_next, favicon: tài nguyên tĩnh của chính bản dựng đang phục vụ.
 */
export const FAILOVER_SKIP_PREFIXES = ["/api/health", "/api/cron", "/_next", "/favicon.ico"];

export function shouldSkipFailover(pathname: string): boolean {
  return FAILOVER_SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

/**
 * Ép về dạng gốc chuẩn: chỉ giữ scheme + host (+ cổng), bỏ đường dẫn và dấu /
 * cuối. Người nhập dễ dán cả đường dẫn vào, mà giữ lại là mọi trang đều bị đẩy
 * về đúng một chỗ đó.
 */
export function normalizeOrigin(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Đích trùng máy đang phục vụ thì tuyệt đối không được đẩy — cả hai máy đọc
 * chung một dòng cấu hình trong CSDL, nên thiếu chốt này là khách bị đá qua đá
 * lại tới khi trình duyệt bỏ cuộc.
 */
export function isSameHost(requestHost: string, target: string): boolean {
  if (!requestHost) return false;
  try {
    const t = new URL(target).host.toLowerCase();
    const r = requestHost.toLowerCase();
    // www.arexnetwork.site và arexnetwork.site coi như một máy.
    const strip = (h: string) => h.replace(/^www\./, "");
    return t === r || strip(t) === strip(r);
  } catch {
    return false;
  }
}

export function parseFailover(raw: string | null | undefined): FailoverConfig {
  if (!raw) return DEFAULT_FAILOVER;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_FAILOVER;
  }
  if (!data || typeof data !== "object") return DEFAULT_FAILOVER;
  const o = data as Record<string, unknown>;
  const target = typeof o.target === "string" ? (normalizeOrigin(o.target) ?? "") : "";
  return {
    // Không có đích thì coi như tắt, dù cờ có bật: bật mà không biết đẩy đi đâu
    // là hỏng nặng hơn không bật.
    enabled: o.enabled === true && target !== "",
    target,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
    updatedBy: typeof o.updatedBy === "string" ? o.updatedBy.slice(0, 120) : undefined,
    note: typeof o.note === "string" ? o.note.slice(0, 300) : undefined,
  };
}

export function serializeFailover(cfg: FailoverConfig): string {
  return JSON.stringify({
    enabled: cfg.enabled === true && !!cfg.target,
    target: cfg.target,
    updatedAt: cfg.updatedAt ?? new Date().toISOString(),
    updatedBy: cfg.updatedBy,
    note: cfg.note,
  });
}
