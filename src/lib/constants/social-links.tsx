import {
  Facebook, Instagram, Youtube, Globe, Twitter, Twitch,
  MessageCircle, Send, Github, AtSign,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type SocialKey =
  | "facebook" | "tiktok" | "instagram" | "youtube" | "website"
  | "discord" | "twitch" | "twitter" | "telegram" | "zalo" | "threads" | "github";

export type SocialMeta = {
  key: SocialKey;
  field: string;            // column name on users table (e.g. facebook_url)
  label: string;
  icon: ComponentType<{ className?: string }>;
  brand: string;            // tailwind hover classes for branded color
  placeholder: string;
};

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z" />
    </svg>
  );
}

export function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.5 5.1 3.8 6.7l-.6 2.4c-.1.4.3.7.6.5l2.7-1.4c1.1.3 2.3.5 3.5.5 5.5 0 10-3.9 10-8.7S17.5 2 12 2z" />
    </svg>
  );
}

export const SOCIAL_DEFS: SocialMeta[] = [
  { key: "facebook",  field: "facebook_url",  label: "Facebook",  icon: Facebook,      brand: "hover:text-[#1877F2] hover:border-[#1877F2]/40", placeholder: "https://facebook.com/..." },
  { key: "instagram", field: "instagram_url", label: "Instagram", icon: Instagram,     brand: "hover:text-[#E1306C] hover:border-[#E1306C]/40", placeholder: "https://instagram.com/..." },
  { key: "tiktok",    field: "tiktok_url",    label: "TikTok",    icon: TikTokIcon,    brand: "hover:text-foreground hover:border-foreground/40", placeholder: "https://tiktok.com/@..." },
  { key: "youtube",   field: "youtube_url",   label: "YouTube",   icon: Youtube,       brand: "hover:text-[#FF0000] hover:border-[#FF0000]/40", placeholder: "https://youtube.com/@..." },
  { key: "twitter",   field: "twitter_url",   label: "X / Twitter", icon: Twitter,     brand: "hover:text-foreground hover:border-foreground/40", placeholder: "https://x.com/..." },
  { key: "threads",   field: "threads_url",   label: "Threads",   icon: AtSign,        brand: "hover:text-foreground hover:border-foreground/40", placeholder: "https://threads.net/@..." },
  { key: "twitch",    field: "twitch_url",    label: "Twitch",    icon: Twitch,        brand: "hover:text-[#9146FF] hover:border-[#9146FF]/40", placeholder: "https://twitch.tv/..." },
  { key: "discord",   field: "discord_url",   label: "Discord",   icon: MessageCircle, brand: "hover:text-[#5865F2] hover:border-[#5865F2]/40", placeholder: "https://discord.gg/..." },
  { key: "telegram",  field: "telegram_url",  label: "Telegram",  icon: Send,          brand: "hover:text-[#26A5E4] hover:border-[#26A5E4]/40", placeholder: "https://t.me/..." },
  { key: "zalo",      field: "zalo_url",      label: "Zalo",      icon: ZaloIcon as ComponentType<SVGProps<SVGSVGElement>>, brand: "hover:text-[#0068FF] hover:border-[#0068FF]/40", placeholder: "https://zalo.me/..." },
  { key: "github",    field: "github_url",    label: "GitHub",    icon: Github,        brand: "hover:text-foreground hover:border-foreground/40", placeholder: "https://github.com/..." },
  { key: "website",   field: "website_url",   label: "Website",   icon: Globe,         brand: "hover:text-primary hover:border-primary/40", placeholder: "https://..." },
];
