import {
  LayoutDashboard, BarChartBig, ScrollText, History, Rocket,
  Newspaper, CalendarRange, Radio, ImageIcon, BookOpen, Grid2x2, Bell, Brain, ListChecks, Swords, Layers, CalendarClock,
  MessagesSquare, MessageSquare, Vote, Star, Headset, Megaphone, Trophy,
  Users, Medal, Award, Palette, HandHeart, ShieldCheck,
  Settings, Lock, FileCode, CircleUser, Activity,
  FileText, FileSignature, Users2, SlidersHorizontal, Eye, Download,
  ShoppingBag, Share2, Handshake, Store, KeyRound, Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = { title: string; href: string; icon: LucideIcon };

/**
 * Điều kiện vào từng mục nằm ở `lib/constants/admin-routes.ts` (file đó không
 * import icon nên middleware nạp được). Sidebar / Ctrl-K / bảng truy cập nhanh
 * chỉ nhận sẵn danh sách href được phép từ server rồi lọc theo.
 */
export type AdminNavGroup = { label: string; icon: LucideIcon; items: AdminNavItem[] };

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Tổng quan",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard",  href: "/admin",          icon: LayoutDashboard },
      { title: "Thống kê",   href: "/admin/stats",    icon: BarChartBig },
      { title: "Nhật ký",    href: "/admin/logs",     icon: ScrollText },
      { title: "Phiên bản",  href: "/admin/changelog", icon: History },
    ],
  },
  {
    label: "Dự án",
    icon: Rocket,
    items: [
      { title: "Quản lý dự án", href: "/admin/projects", icon: Rocket },
      { title: "Xem Roadmap",   href: "/coming-soon",     icon: Eye },
    ],
  },
  {
    label: "Nội dung",
    icon: FileText,
    items: [
      { title: "Tin tức",   href: "/admin/news",     icon: Newspaper },
      { title: "Sự kiện",   href: "/admin/events",   icon: CalendarRange },
      { title: "Esports",   href: "/admin/esports",  icon: Radio },
      { title: "Thư viện",  href: "/admin/gallery",  icon: ImageIcon },
      { title: "Wiki",      href: "/admin/wiki",     icon: BookOpen },
      { title: "FF Items",  href: "/admin/ff-items", icon: Grid2x2 },
      { title: "Vũ khí",    href: "/admin/weapons", icon: Swords },
      { title: "Combo vũ khí", href: "/admin/loadouts", icon: Layers },
      { title: "Tier Lists", href: "/admin/tier-lists", icon: ListChecks },
      { title: "Pop-up",    href: "/admin/popup",    icon: Bell },
      { title: "Quiz",      href: "/admin/quiz",     icon: Brain },
      { title: "Mạng xã hội", href: "/admin/social", icon: Share2 },
      { title: "Đếm ngược",  href: "/admin/countdowns", icon: CalendarClock },
      { title: "Nội dung trang", href: "/admin/page-content", icon: FileText },
      { title: "Verified Content", href: "/admin/verified-content", icon: ShieldCheck },
    ],
  },
  {
    label: "Cửa hàng",
    icon: ShoppingBag,
    items: [
      { title: "Cửa hàng Prime", href: "/admin/prime", icon: ShoppingBag },
      { title: "Chợ Arex",       href: "/admin/shop",  icon: Store },
      { title: "DS mong muốn",   href: "/admin/wishlist", icon: Sparkles },
    ],
  },
  {
    label: "Cộng đồng",
    icon: MessagesSquare,
    items: [
      { title: "Diễn đàn",   href: "/admin/forum",       icon: MessagesSquare },
      { title: "Bình luận",  href: "/admin/comments",    icon: MessageSquare },
      { title: "Bình chọn",  href: "/admin/polls",       icon: Vote },
      { title: "Đánh giá",   href: "/admin/ratings",     icon: Star },
      { title: "CSKH",       href: "/admin/cskh",        icon: Headset },
      { title: "Broadcast",  href: "/admin/broadcast",   icon: Megaphone },
      { title: "Giải đấu",   href: "/admin/tournaments", icon: Trophy },
    ],
  },
  {
    label: "Người dùng",
    icon: Users,
    items: [
      { title: "Người dùng",   href: "/admin/users",        icon: Users },
      { title: "Đội ngũ",      href: "/admin/team",         icon: Users2 },
      { title: "Thành tựu",    href: "/admin/achievements", icon: Medal },
      { title: "Danh hiệu",    href: "/admin/titles",    icon: Award },
      { title: "Cosmetics",    href: "/admin/cosmetics",    icon: Palette },
      { title: "Contributors", href: "/admin/contributors", icon: HandHeart },
      { title: "Hợp tác",      href: "/admin/partners",      icon: Handshake },
      { title: "Hợp đồng",     href: "/admin/partnership-contracts", icon: FileSignature },
      { title: "Giấy phép",    href: "/admin/licenses",      icon: KeyRound },
      { title: "Phân quyền",   href: "/admin/permissions",  icon: ShieldCheck },
    ],
  },
  {
    label: "Hệ thống",
    icon: SlidersHorizontal,
    items: [
      { title: "Cài đặt",   href: "/admin/settings",  icon: Settings },
      { title: "Vận hành",  href: "/admin/ops",       icon: Activity },
      { title: "Tải app",   href: "/admin/app",       icon: Download },
      { title: "Khóa chức năng", href: "/admin/feature-locks", icon: Lock },
      { title: "Bảo mật",   href: "/admin/security",  icon: Lock },
      { title: "API Docs",  href: "/admin/api-docs",  icon: FileCode },
      { title: "Hồ sơ",     href: "/admin/profile",   icon: CircleUser },
    ],
  },
];

// Giữ để tương thích chỗ khác nếu cần (danh sách phẳng)
export const adminNavFlat: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);
