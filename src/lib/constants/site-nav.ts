import type { LucideIcon } from "lucide-react";
import { Home, Newspaper, Calendar, Radio, Trophy, Users, ListChecks, Swords, UserRound, Wrench, Flame, Crown } from "lucide-react";

export type SiteNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  aliases?: string[];
};

export const siteNav: SiteNavItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Đang hot", href: "/dang-hot", icon: Flame },
  { label: "Tin tức", href: "/news", icon: Newspaper, aliases: ["/tin-tuc"] },
  { label: "Sự kiện", href: "/events", icon: Calendar, aliases: ["/su-kien"] },
  { label: "Esports", href: "/esports", icon: Radio, aliases: ["/the-thao-dien-tu"] },
  { label: "Tier List", href: "/tier-lists", icon: ListChecks, aliases: ["/bang-xep-hang"] },
  { label: "Vũ khí", href: "/vu-khi", icon: Swords, aliases: ["/weapons"] },
  { label: "Nhân vật", href: "/nhan-vat", icon: UserRound, aliases: ["/characters"] },
  { label: "Công cụ", href: "/cong-cu", icon: Wrench, aliases: ["/tools"] },
  { label: "BXH Nick", href: "/bxh-nick", icon: Crown },
  { label: "Giải đấu", href: "/tournaments", icon: Trophy, aliases: ["/giai-dau"] },
  { label: "Cộng đồng", href: "/cong-dong", icon: Users, aliases: ["/community"] },
];

export const moreNav: SiteNavItem[] = [
  { label: "Về chúng tôi", href: "/about" },
  { label: "Điều khoản", href: "/terms-of-use" },
  { label: "Bảo mật", href: "/privacy-policy" },
  { label: "Liên hệ", href: "/contact" },
];

export const allNav = [...siteNav, ...moreNav];