import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap, resolveSocialLinks } from "@/lib/utils/site-settings";
import { siteConfig } from "@/lib/constants/site";
import {
  FacebookBrandIcon,
  YoutubeBrandIcon,
  TiktokBrandIcon,
  GmailBrandIcon,
} from "@/components/common/brand-icons";
import { cn } from "@/lib/utils";

function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
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

  const channels: Channel[] = [
    social.email && {
      name: "Email", value: social.email, href: `mailto:${social.email}`,
      Icon: GmailBrandIcon, brand: "hover:border-red-500/50 hover:text-red-500",
    },
    social.facebook && {
      name: "Facebook", value: "Nhắn tin Fanpage", href: social.facebook,
      Icon: FacebookBrandIcon, brand: "hover:border-[#1877F2]/50 hover:text-[#1877F2]",
    },
    zalo && {
      name: "Zalo", value: "Nhóm cộng đồng", href: zalo,
      Icon: ZaloIcon, brand: "hover:border-[#0068FF]/50 hover:text-[#0068FF]",
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
