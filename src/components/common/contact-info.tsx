import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap, resolveSocialLinks } from "@/lib/utils/site-settings";
import { siteConfig } from "@/lib/constants/site";
import {
  FacebookBrandIcon,
  YoutubeBrandIcon,
  TiktokBrandIcon,
  GmailBrandIcon,
} from "@/components/common/brand-icons";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

type Channel = {
  name: string;
  value: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  brand: string;
};

/**
 * Khối thông tin liên hệ — đọc từ settings (Email, MXH) + siteConfig (Zalo),
 * hiển thị các kênh liên hệ ngay trên trang. Dùng cho /hop-tac, /lien-he…
 */
export async function ContactInfo({ className }: { className?: string }) {
  const settings = await getSettings().catch(() => []);
  const map = buildSettingsMap(settings);
  const social = resolveSocialLinks(map);
  const zalo = map["social.zalo_url"] || siteConfig.links.community;
  const phone = map["social.phone"]?.trim();
  const telegram = map["social.telegram_url"]?.trim();
  const discord = map["social.discord_url"]?.trim();

  const channels: Channel[] = [
    social.email && {
      name: "Email", value: social.email, href: `mailto:${social.email}`,
      Icon: GmailBrandIcon, brand: "hover:border-red-500/50 hover:text-red-500",
    },
    phone && {
      name: "Điện thoại", value: phone, href: `tel:${phone.replace(/\s+/g, "")}`,
      Icon: Phone, brand: "hover:border-emerald-500/50 hover:text-emerald-500",
    },
    zalo && {
      name: "Zalo", value: "Nhóm cộng đồng", href: zalo,
      Icon: ZaloIcon, brand: "hover:border-[#0068FF]/50 hover:text-[#0068FF]",
    },
    social.facebook && {
      name: "Facebook", value: "Nhắn tin Fanpage", href: social.facebook,
      Icon: FacebookBrandIcon, brand: "hover:border-[#1877F2]/50 hover:text-[#1877F2]",
    },
    telegram && {
      name: "Telegram", value: "Kênh Telegram", href: telegram,
      Icon: TelegramIcon, brand: "hover:border-[#229ED9]/50 hover:text-[#229ED9]",
    },
    discord && {
      name: "Discord", value: "Máy chủ Discord", href: discord,
      Icon: DiscordIcon, brand: "hover:border-[#5865F2]/50 hover:text-[#5865F2]",
    },
    social.youtube && {
      name: "YouTube", value: "Kênh chính thức", href: social.youtube,
      Icon: YoutubeBrandIcon, brand: "hover:border-[#FF0000]/50 hover:text-[#FF0000]",
    },
    social.tiktok && {
      name: "TikTok", value: "Theo dõi TikTok", href: social.tiktok,
      Icon: TiktokBrandIcon, brand: "hover:border-foreground/60",
    },
  ].filter(Boolean) as Channel[];

  if (channels.length === 0) return null;

  return (
    <div className={cn("grid gap-2.5 sm:grid-cols-2", className)}>
      {channels.map((c) => {
        const external = !c.href.startsWith("mailto");
        return (
          <a
            key={c.name}
            href={c.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors",
              c.brand,
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <c.Icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.name}</span>
              <span className="block truncate text-sm font-semibold text-foreground">{c.value}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
