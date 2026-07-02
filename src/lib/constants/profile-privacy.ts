import { FileText, Phone, Gamepad2, Link2, Trophy, type LucideIcon } from "lucide-react";

export type PrivacyKey = "bio" | "contact" | "games" | "socials" | "achievements";

export type PrivacyMap = Partial<Record<PrivacyKey, boolean>>;

export const PRIVACY_SECTIONS: { key: PrivacyKey; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "bio",          label: "Tiểu sử",        desc: "Đoạn giới thiệu về bạn",              icon: FileText },
  { key: "contact",      label: "Liên hệ",        desc: "Số điện thoại & email liên hệ",       icon: Phone },
  { key: "games",        label: "Game & UID",     desc: "Free Fire ID và các game đang chơi",  icon: Gamepad2 },
  { key: "socials",      label: "Mạng xã hội",    desc: "Facebook, TikTok, YouTube...",         icon: Link2 },
  { key: "achievements", label: "Thành tích",     desc: "Huy hiệu & thành tựu đã đạt",          icon: Trophy },
];

/** Default: a section is visible unless explicitly turned off. */
export function isSectionVisible(privacy: PrivacyMap | null | undefined, key: PrivacyKey): boolean {
  return privacy?.[key] !== false;
}
