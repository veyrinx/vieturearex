import {
  BUILTIN_ROLE_LEVELS,
  hasCapabilityWithRoles,
  type CapabilityKey,
  type ResolvedRole,
  type RoleCapabilityMap,
} from "@/lib/permissions";

/**
 * Điều kiện vào từng trang trong /admin.
 *
 * File này CỐ TÌNH không import icon hay bất cứ thứ gì của React: nó được
 * `src/middleware.ts` nạp, mà middleware kéo theo cả cây import của mình vào
 * bundle chạy trước mọi request. Icon để bên `admin-nav.ts`.
 *
 * Hai loại điều kiện, cùng áp một lúc:
 *   capability — có trong ma trận phân quyền (/admin/permissions). Dùng cho
 *                những khu vực đã có sẵn capability, để nút bấm bên trong và
 *                cái link ở sidebar cùng nghe một nguồn.
 *   minLevel   — bậc vai tối thiểu. Dùng cho khu vực chưa có capability riêng;
 *                khỏi phải đẻ thêm hai chục key mới rồi bắt người dùng đi tick
 *                lại từ đầu (ma trận đã lưu trong settings sẽ không tự có key
 *                mới, tick thiếu là khoá nhầm người).
 *
 * Không khai ở đây = ai vào /admin được thì vào được (dashboard, changelog, hồ sơ).
 */

const LV = BUILTIN_ROLE_LEVELS;

export type AdminRouteRule = {
  path: string;
  capability?: CapabilityKey;
  minLevel?: number;
};

export const ADMIN_ROUTE_RULES: AdminRouteRule[] = [
  // ── Tổng quan ──
  { path: "/admin/stats",    capability: "analytics.view" },
  { path: "/admin/logs",     capability: "logs.view" },

  // ── Dự án ──
  { path: "/admin/projects", minLevel: LV.admin },

  // ── Nội dung ──
  { path: "/admin/news",       capability: "news.edit" },
  { path: "/admin/events",     capability: "events.edit" },
  { path: "/admin/esports",    capability: "esports.edit" },
  { path: "/admin/gallery",    capability: "gallery.upload" },
  { path: "/admin/wiki",       minLevel: LV.manager },
  { path: "/admin/ff-items",   minLevel: LV.manager },
  { path: "/admin/weapons",    minLevel: LV.manager },
  { path: "/admin/loadouts",   minLevel: LV.manager },
  { path: "/admin/tier-lists", minLevel: LV.manager },
  { path: "/admin/popup",      minLevel: LV.manager },
  { path: "/admin/quiz",       minLevel: LV.manager },
  { path: "/admin/social",     minLevel: LV.manager },
  { path: "/admin/countdowns", minLevel: LV.manager },
  { path: "/admin/page-content", minLevel: LV.manager },
  { path: "/admin/verified-content", capability: "verified_content.verify" },

  // ── Cửa hàng & dịch vụ ──
  { path: "/admin/prime",    minLevel: LV.admin },
  { path: "/admin/shop",     capability: "shop.order.view_all" },
  { path: "/admin/wishlist", capability: "wishlist.view" },

  // ── Cộng đồng ──
  { path: "/admin/forum",       capability: "comments.moderate" },
  { path: "/admin/comments",    capability: "comments.moderate" },
  { path: "/admin/polls",       minLevel: LV.manager },
  { path: "/admin/ratings",     capability: "ratings.manage" },
  { path: "/admin/cskh",        minLevel: LV.support },
  { path: "/admin/broadcast",   minLevel: LV.admin },
  { path: "/admin/tournaments", capability: "tms.manage" },
  { path: "/admin/scam-reports", minLevel: LV.manager },

  // ── Người dùng ──
  { path: "/admin/users",        capability: "users.view" },
  { path: "/admin/team",         capability: "team.approve_it" },
  { path: "/admin/achievements", minLevel: LV.manager },
  { path: "/admin/titles",       minLevel: LV.manager },
  { path: "/admin/cosmetics",    minLevel: LV.manager },
  { path: "/admin/contributors", minLevel: LV.manager },
  { path: "/admin/partners",     minLevel: LV.admin },
  { path: "/admin/partnership-contracts", minLevel: LV.admin },
  { path: "/admin/licenses",     minLevel: LV.admin },
  { path: "/admin/permissions",  capability: "permissions.edit" },

  // ── Hệ thống ──
  { path: "/admin/settings",      capability: "settings.edit" },
  { path: "/admin/sql",           capability: "sql.run" },
  { path: "/admin/ops",           minLevel: LV.admin },
  { path: "/admin/app",           minLevel: LV.admin },
  { path: "/admin/feature-locks", minLevel: LV.admin },
  { path: "/admin/security",      minLevel: LV.admin },
  { path: "/admin/api-docs",      minLevel: LV.admin },
];

const norm = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

/** Luật khớp sâu nhất cho một đường dẫn (`/admin/shop/orders` ăn luật `/admin/shop`). */
export function adminRouteRule(pathname: string): AdminRouteRule | null {
  const path = norm(pathname);
  let best: AdminRouteRule | null = null;
  for (const rule of ADMIN_ROUTE_RULES) {
    if (path === rule.path || path.startsWith(`${rule.path}/`)) {
      if (!best || rule.path.length > best.path.length) best = rule;
    }
  }
  return best;
}

export type AdminAccessContext = {
  role: string | null;
  /** Bậc vai đã tính (custom role tính theo level khai trong settings). */
  level: number;
  matrix: RoleCapabilityMap;
  resolved: ResolvedRole[];
};

/**
 * Người này có được vào đường dẫn admin đó không.
 *
 * super_admin (và vai custom cao hơn super_admin) đi qua mọi luật —
 * `hasCapabilityWithRoles` đã lo phần capability, còn minLevel thì level của họ
 * vốn đã cao hơn tất cả.
 */
export function canAccessAdminRoute(pathname: string, ctx: AdminAccessContext): boolean {
  const rule = adminRouteRule(pathname);
  if (!rule) return true;
  if (rule.minLevel !== undefined && ctx.level < rule.minLevel) return false;
  if (rule.capability && !hasCapabilityWithRoles(ctx.role, rule.capability, ctx.matrix, ctx.resolved)) {
    return false;
  }
  return true;
}
