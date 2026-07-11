export const siteConfig = {
  id: "arex",
  name: "Arex - Trang Tin Tức Cộng Đồng Free Fire",
  shortName: "Arex",
  description:
    "Arex – Cổng thông tin cộng đồng Free Fire hàng đầu. Cập nhật nhanh nhất các sự kiện in-game, tin tức Esports chuyên sâu và các hoạt động cộng đồng nổi bật. Trang độc lập, khách quan, được vận hành và phát triển bởi đội ngũ Arex.",
  url: "https://arexnetwork.site",
  productionUrl: "https://arexnetwork.site",
  ogImage: "/og-image.png",
  favicon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  sidebarIcon: "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif",
  links: {
    community: "https://zalo.me/g/ngjnze275",
    facebook: "https://facebook.com/share/1CT8XYU2oF/?mibexitid=wwXlfr",
    tiktok: "https://tiktok.com/vieturetechnologycenter",
    youtube: "https://youtube.com",
  },
  contactEmail: "admin@vieture.tech",
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
  contactEmail: "admin@iscnetwork.site",
} as const;

export type SiteConfig = typeof siteConfig | typeof iscConfig;

const SITE_CONFIGS: Record<string, SiteConfig> = {
  "arexnetwork.site": siteConfig,
  "www.arexnetwork.site": siteConfig,
  "iscnetwork.site": iscConfig,
  "www.iscnetwork.site": iscConfig,
};

export function getSiteConfigByHostname(hostname: string): typeof siteConfig | typeof iscConfig {
  const clean = hostname.split(":")[0].toLowerCase();
  return SITE_CONFIGS[clean] ?? siteConfig;
}

export const navItems = [
  { title: "TRANG CHỦ", href: "/" },
  { title: "LỊCH", href: "/calendar" },
  { title: "SỰ KIỆN", href: "/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/esports" },
  { title: "TIN TỨC", href: "/news" },
] as const;

export const adminNavItems = [
  { title: "DASHBOARD", href: "/admin" },
  { title: "SỰ KIỆN", href: "/admin/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/admin/esports" },
  { title: "TIN TỨC", href: "/admin/news" },
  { title: "THƯ VIỆN", href: "/admin/gallery" },
  { title: "NGƯỜI DÙNG", href: "/admin/users" },
  { title: "THÀNH TỰU", href: "/admin/achievements" },
  { title: "DANH HIỆU", href: "/admin/danh-hieu" },
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
  { title: "PHÂN QUYỀN", href: "/admin/permissions" },
  { title: "CÀI ĐẶT", href: "/admin/settings" },
  { title: "API DOCS", href: "/admin/api-docs" },
  { title: "HỒ SƠ", href: "/admin/profile" },
] as const;
