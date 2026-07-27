import type { LucideIcon } from "lucide-react";
import { Home, Newspaper, Calendar, Radio, Trophy, Users, ListChecks, Swords, UserRound, Wrench, Flame, Rocket } from "lucide-react";

export type SiteNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  aliases?: string[];
};

export const siteNav: SiteNavItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Đang hot", href: "/trending", icon: Flame },
  { label: "Tin tức", href: "/news", icon: Newspaper, aliases: ["/tin-tuc"] },
  { label: "Sự kiện", href: "/events", icon: Calendar, aliases: ["/su-kien"] },
  { label: "Esports", href: "/esports", icon: Radio, aliases: ["/the-thao-dien-tu"] },
  { label: "Tier List", href: "/tier-lists", icon: ListChecks, aliases: ["/bang-xep-hang"] },
  { label: "Vũ khí", href: "/weapons", icon: Swords, aliases: ["/weapons"] },
  { label: "Nhân vật", href: "/characters", icon: UserRound, aliases: ["/characters"] },
  { label: "Công cụ", href: "/tools", icon: Wrench, aliases: ["/tools"] },
  { label: "Giải đấu", href: "/tournaments", icon: Trophy, aliases: ["/giai-dau"] },
  { label: "Cộng đồng", href: "/community", icon: Users, aliases: ["/community"] },
  { label: "Sắp ra mắt", href: "/coming-soon", icon: Rocket, aliases: ["/roadmap"] },
];

export const moreNav: SiteNavItem[] = [
  { label: "Về chúng tôi", href: "/about" },
  { label: "Điều khoản", href: "/terms-of-use" },
  { label: "Bảo mật", href: "/privacy-policy" },
  { label: "Liên hệ", href: "/contact" },
];

export const allNav = [...siteNav, ...moreNav];