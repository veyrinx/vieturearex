export const siteConfig = {
  id: "arex",
  name: "Arex - Trang Tin Tức Cộng Đồng Free Fire",
  shortName: "Arex",
  description:
    "Arex – Cổng thông tin cộng đồng Free Fire hàng đầu. Cập nhật nhanh nhất các sự kiện in-game, tin tức Esports chuyên sâu và các hoạt động cộng đồng nổi bật. Trang độc lập, khách quan, được vận hành và phát triển bởi đội ngũ Arex.",
  // ⚠️ Đây phải là tên miền Vercel PHỤC VỤ TRỰC TIẾP (Primary Domain), không
  // phải tên miền alias. Mọi tên miền còn lại (arexnetwork.site, .vn trần,
  // www.arexnetwork.site) đang trả 308 về đây; ai không chịu đi theo chuyển
  // hướng — Telegram setWebhook, endpoint Discord, webhook Zalo — sẽ chết lặng
  // nếu chỗ này ghi tên miền alias. Đổi Primary Domain trên Vercel thì sửa lại
  // đúng một dòng này.
  url: "https://www.arexnetwork.vn",
  productionUrl: "https://www.arexnetwork.vn",
  ogImage: "/og-image.png",
  favicon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  sidebarIcon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  links: {
    community: "https://zalo.me/g/ngjnze275",
    facebook: "https://facebook.com/share/1CT8XYU2oF/?mibexitid=wwXlfr",
    tiktok: "https://tiktok.com/vieturetechnologycenter",
    youtube: "https://youtube.com",
  },
  contactEmail: "contact@arexnetwork.site",
} as const;

// ── ISC Network config ─────────────────────────────────────────────────────
// TODO: cập nhật favicon, logo, links của ISC bên dưới
export const iscConfig = {
  id: "isc",
  name: "ISC Network - Trang Tin Tức Cộng Đồng Free Fire",
  shortName: "ISC Network",
  description:
    "ISC Network – Cổng thông tin cộng đồng Free Fire. Cập nhật nhanh nhất các sự kiện in-game, tin tức Esports chuyên sâu và các hoạt động cộng đồng nổi bật.",
  url: "https://iscnetwork.site",
  productionUrl: "https://iscnetwork.site",
  ogImage: "/og-image.png",
  favicon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  sidebarIcon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  links: {
    community: "https://zalo.me/g/ngjnze275",
    facebook: "https://facebook.com",
    tiktok: "https://tiktok.com",
    youtube: "https://youtube.com",
  },
  contactEmail: "contact@iscnetwork.site",
} as const;

export type SiteConfig = typeof siteConfig | typeof iscConfig;

const SITE_CONFIGS: Record<string, SiteConfig> = {
  "arexnetwork.site": siteConfig,
  "www.arexnetwork.site": siteConfig,
  "arexnetwork.vn": siteConfig,
  "www.arexnetwork.vn": siteConfig,
  "iscnetwork.site": iscConfig,
  "www.iscnetwork.site": iscConfig,
};

export function getSiteConfigByHostname(hostname: string): typeof siteConfig | typeof iscConfig {
  const clean = hostname.split(":")[0].toLowerCase();
  return SITE_CONFIGS[clean] ?? siteConfig;
}

/**
 * Các tên miền gốc do Arex vận hành. Site chạy song song nhiều tên miền
 * (`arexnetwork.site` và `arexnetwork.vn`), nên mọi chỗ hỏi "link này có phải
 * của mình không" đều phải hỏi ở đây — viết tay một tên miền là chỗ đó lệch:
 * app native sẽ đá link nhà mình ra trình duyệt ngoài, deep link thì rơi mất.
 */
export const AREX_DOMAINS = ["arexnetwork.site", "arexnetwork.vn"] as const;

export function isArexHost(hostname: string): boolean {
  const clean = hostname.split(":")[0].toLowerCase();
  return AREX_DOMAINS.some((d) => clean === d || clean.endsWith(`.${d}`));
}

/**
 * Chuẩn hoá một gốc URL: bỏ dấu `/` thừa cuối, và nếu nó trỏ vào một tên miền
 * Arex KHÔNG phải tên miền đang phục vụ trực tiếp thì kéo về `siteConfig.url`.
 *
 * Vì sao cần: NEXT_PUBLIC_SITE_URL trên Vercel dễ bị bỏ quên ở tên miền cũ, mà
 * tên miền cũ giờ trả 308. Trình duyệt đi theo chuyển hướng nên không ai thấy
 * gì, nhưng máy gọi máy thì không: Telegram/Discord/Zalo đăng ký webhook vào
 * địa chỉ 308 là im lặng chết. Hàm này để một biến môi trường đặt sai không kéo
 * sập cả đám tích hợp.
 *
 * Tên miền ngoài Arex (localhost, *.vercel.app khi xem thử) giữ nguyên.
 */
export function normalizeSiteUrl(raw?: string | null): string {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed) return siteConfig.url;
  try {
    const host = new URL(trimmed).host.toLowerCase();
    if (isArexHost(host) && host !== new URL(siteConfig.url).host) return siteConfig.url;
    return trimmed;
  } catch {
    return siteConfig.url;
  }
}

/**
 * Gốc URL công khai của site — dùng cho link trong email, thông báo Telegram/
 * Discord, deep link app. Luôn dùng hằng này thay vì tự viết
 * `process.env.NEXT_PUBLIC_SITE_URL ?? "https://…"` ở từng file: viết tay là
 * mỗi chỗ lệch một kiểu khi đổi tên miền.
 */
export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

// Tra cứu theo mã site thay vì tên miền. Dùng khi một bản triển khai chỉ phục vụ
// đúng một site và biết trước mình là ai (xem NEXT_PUBLIC_SITE_ID trong
// lib/server/get-site-config.ts) — nhờ vậy khỏi phải đọc header của request.
const SITE_CONFIGS_BY_ID: Record<string, SiteConfig> = {
  [siteConfig.id]: siteConfig,
  [iscConfig.id]: iscConfig,
};

export function getSiteConfigById(id: string): SiteConfig | null {
  return SITE_CONFIGS_BY_ID[id.trim().toLowerCase()] ?? null;
}

export const navItems = [
  { title: "TRANG CHỦ", href: "/" },
  { title: "LỊCH", href: "/calendar" },
  { title: "SỰ KIỆN", href: "/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/esports" },
  { title: "TIN TỨC", href: "/news" },
  { title: "CHỢ AREX", href: "/shop" },
  { title: "SẮP RA MẮT", href: "/coming-soon" },
] as const;

export const adminNavItems = [
  { title: "DASHBOARD", href: "/admin" },
  { title: "SỰ KIỆN", href: "/admin/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/admin/esports" },
  { title: "TIN TỨC", href: "/admin/news" },
  { title: "THƯ VIỆN", href: "/admin/gallery" },
  { title: "NGƯỜI DÙNG", href: "/admin/users" },
  { title: "THÀNH TỰU", href: "/admin/achievements" },
  { title: "DANH HIỆU", href: "/admin/titles" },
  { title: "COSMETICS", href: "/admin/cosmetics" },
  { title: "WIKI", href: "/admin/wiki" },
  { title: "FF ITEMS", href: "/admin/ff-items" },
  { title: "CONTRIBUTORS", href: "/admin/contributors" },
  { title: "BROADCAST", href: "/admin/broadcast" },
  { title: "CSKH", href: "/admin/cskh" },
  { title: "DIỄN ĐÀN", href: "/admin/forum" },
  { title: "BÌNH LUẬN", href: "/admin/comments" },
  { title: "BÌNH CHỌN", href: "/admin/polls" },
  { title: "ĐÁNH GIÁ", href: "/admin/ratings" },
  { title: "POP-UP", href: "/admin/popup" },
  { title: "NHẬT KÝ", href: "/admin/logs" },
  { title: "THỐNG KÊ", href: "/admin/stats" },
  { title: "PHIÊN BẢN", href: "/admin/changelog" },
  { title: "ĐỘI NGŨ", href: "/admin/team" },
  { title: "BẢO MẬT", href: "/admin/security" },
  { title: "GIẢI ĐẤU", href: "/admin/tournaments" },
  { title: "CHỢ AREX", href: "/admin/shop" },
  { title: "PHÂN QUYỀN", href: "/admin/permissions" },
  { title: "CÀI ĐẶT", href: "/admin/settings" },
  { title: "API DOCS", href: "/admin/api-docs" },
  { title: "HỒ SƠ", href: "/admin/profile" },
] as const;
