import {
  LayoutDashboard, BarChartBig, ScrollText, History,
  Newspaper, CalendarRange, Radio, ImageIcon, BookOpen, Grid2x2, Bell, Brain, ListChecks, Swords, Layers,
  MessagesSquare, MessageSquare, Vote, Star, Headset, Megaphone, Trophy,
  Users, Medal, Award, Palette, HandHeart, ShieldCheck,
  Settings, Lock, FileCode, CircleUser,
  FileText, Users2, SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = { title: string; href: string; icon: LucideIcon };
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
      { title: "Danh hiệu",    href: "/admin/danh-hieu",    icon: Award },
      { title: "Cosmetics",    href: "/admin/cosmetics",    icon: Palette },
      { title: "Contributors", href: "/admin/contributors", icon: HandHeart },
      { title: "Phân quyền",   href: "/admin/permissions",  icon: ShieldCheck },
    ],
  },
  {
    label: "Hệ thống",
    icon: SlidersHorizontal,
    items: [
      { title: "Cài đặt",   href: "/admin/settings",  icon: Settings },
      { title: "Khóa chức năng", href: "/admin/feature-locks", icon: Lock },
      { title: "Bảo mật",   href: "/admin/security",  icon: Lock },
      { title: "API Docs",  href: "/admin/api-docs",  icon: FileCode },
      { title: "Hồ sơ",     href: "/admin/profile",   icon: CircleUser },
    ],
  },
];

// Giữ để tương thích chỗ khác nếu cần (danh sách phẳng)
export const adminNavFlat: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);
