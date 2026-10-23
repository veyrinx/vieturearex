import "server-only";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/server/get-client-ip";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CraftlandEventType } from "@/lib/types/craftland";

/**
 * Thu thập sự kiện bản đồ Craftland.
 *
 * Lớp này chỉ lo phần "ai đang gửi": lọc bot, băm khách ẩn danh, phân loại
 * nguồn. Phần "có tính hay không" (chống trùng 30 phút, chủ map tự xem, map
 * chưa xuất bản) nằm trong hàm `craftland_record_event` ở Postgres để hai
 * request song song không lách được nhau.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|python-requests|python-urllib|curl\/|wget|axios|node-fetch|undici|go-http|okhttp|java\/|libwww|httpclient|scrapy|phantomjs|puppeteer|playwright|selenium/i;

export type RejectReason = "bot" | "cross_origin" | "rate";

export function detectBot(request: NextRequest): RejectReason | null {
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return "bot";

  // Sự kiện chỉ được gửi từ chính trang của site. Trình duyệt luôn gắn Origin
  // cho POST fetch/sendBeacon; thiếu hoặc khác host = script bên ngoài bơm số.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return "cross_origin";
  try {
    if (new URL(origin).host !== host) return "cross_origin";
  } catch {
    return "cross_origin";
  }
  return null;
}

function vnDay() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Mã khách ẩn danh: SHA-256(ip | user-agent | ngày | APP_SECRET). Muối đổi mỗi
 * ngày nên không thể nối các ngày với nhau thành hồ sơ một người, và không ai
 * dò ngược được IP từ mã băm khi không có APP_SECRET.
 */
export async function visitorHash(request: NextRequest): Promise<string> {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const secret = process.env.APP_SECRET ?? process.env.NEXT_REDIRECT_SECRET ?? "arex-dev-fallback-change-in-production";
  const data = new TextEncoder().encode(`${ip}|${ua}|${vnDay()}|${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

export function parseDevice(ua: string): string {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/coc_coc_browser/i.test(ua)) return "Cốc Cốc";
  if (/zalo/i.test(ua)) return "Zalo";
  if (/fban|fbav|fb_iab/i.test(ua)) return "Facebook";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Khác";
}

export function parseCountry(request: NextRequest): string | null {
  const c = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" ? c : null;
}

/**
 * Phân loại nguồn từ referrer do trình duyệt gửi kèm + tham số `src` trên URL
 * bản đồ (link chia sẻ gắn `?src=share`). Chỉ giữ host của trang ngoài, không
 * giữ đường dẫn — đường dẫn có thể chứa thông tin cá nhân.
 */
export function classifySource(
  referrer: string | null | undefined,
  srcParam: string | null | undefined,
  siteHost: string | null,
): { source: string; referrerHost: string | null; searchQuery: string | null } {
  if (srcParam === "share") return { source: "share", referrerHost: null, searchQuery: null };

  if (!referrer) return { source: "direct", referrerHost: null, searchQuery: null };
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return { source: "direct", referrerHost: null, searchQuery: null };
  }

  if (siteHost && url.host !== siteHost) {
    return { source: "external", referrerHost: url.host.slice(0, 100), searchQuery: null };
  }

  const path = url.pathname;
  if (path.startsWith("/community/craftland/maps/")) return { source: "related", referrerHost: null, searchQuery: null };
  if (path.startsWith("/community/craftland/maps")) {
    const q = url.searchParams.get("q")?.trim().slice(0, 80) || null;
    return { source: q ? "search" : "library", referrerHost: null, searchQuery: q };
  }
  if (path.startsWith("/community/craftland/creators/")) return { source: "creator", referrerHost: null, searchQuery: null };
  if (path.startsWith("/community/craftland")) return { source: "home", referrerHost: null, searchQuery: null };
  if (path === "/search") {
    const q = url.searchParams.get("q")?.trim().slice(0, 80) || null;
    return { source: "search", referrerHost: null, searchQuery: q };
  }
  return { source: "direct", referrerHost: null, searchQuery: null };
}

export async function recordRejection(reason: RejectReason) {
  const db = createAdminSupabaseClient();
  if (!db) return;
  // rpc() trả về builder của PostgREST — thenable nhưng KHÔNG có .catch().
  try {
    await (db.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>)(
      "craftland_bump_rejection",
      { p_reason: reason },
    );
  } catch {
    // Đếm lý do loại chỉ để thống kê — lỗi ở đây không được làm hỏng request.
  }
}

export async function recordMapEvent(input: {
  mapId: string;
  type: CraftlandEventType;
  visitor: string;
  actorUserId: string | null;
  source: string;
  referrerHost: string | null;
  device: string;
  browser: string;
  country: string | null;
  searchQuery: string | null;
}): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;
  const { data, error } = await (db.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>)("craftland_record_event", {
    p_map_id: input.mapId,
    p_event_type: input.type,
    p_visitor_hash: input.visitor,
    p_actor_user_id: input.actorUserId,
    p_source: input.source,
    p_referrer_host: input.referrerHost,
    p_device: input.device,
    p_browser: input.browser,
    p_country: input.country,
    p_search_query: input.searchQuery,
    p_window_minutes: 30,
  });
  if (error) {
    console.warn("[craftland] record_event failed:", error.message);
    return false;
  }
  return data === true;
}
