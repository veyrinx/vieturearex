export const siteConfig = {
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

export const navItems = [
  { title: "TRANG CHỦ", href: "/" },
  { title: "LỊCH", href: "/calendar" },
  { title: "SỰ KIỆN", href: "/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/esports" },
  { title: "TIN TỨC", href: "/news" },
  { title: "LIÊN HỆ", href: "/contact" },
] as const;

export const adminNavItems = [
  { title: "DASHBOARD", href: "/admin" },
  { title: "SỰ KIỆN", href: "/admin/events" },
  { title: "PHÁT TRỰC TIẾP", href: "/admin/esports" },
  { title: "TIN TỨC", href: "/admin/news" },
  { title: "THƯ VIỆN", href: "/admin/gallery" },
  { title: "NGƯỜI DÙNG", href: "/admin/users" },
  { title: "CSKH", href: "/admin/cskh" },
  { title: "BÌNH LUẬN", href: "/admin/comments" },
  { title: "ĐÁNH GIÁ", href: "/admin/ratings" },
  { title: "POP-UP", href: "/admin/popup" },
  { title: "NHẬT KÝ", href: "/admin/logs" },
  { title: "BẢO MẬT", href: "/admin/security" },
  { title: "CÀI ĐẶT", href: "/admin/settings" },
  { title: "HỒ SƠ", href: "/admin/profile" },
] as const;
