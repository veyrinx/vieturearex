import { ExternalLink, Users, Star } from "lucide-react";

type JoinCommunityCtaProps = {
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  community?: string;
};

const socialButtons = [
  {
    key: "facebook" as const,
    label: "Facebook",
    shortLabel: "FB",
    colorClass: "bg-[#1877F2] hover:bg-[#0e65d4] text-white border-transparent",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    shortLabel: "YT",
    colorClass: "bg-[#FF0000] hover:bg-[#cc0000] text-white border-transparent",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    shortLabel: "TT",
    colorClass: "bg-black hover:bg-neutral-800 text-white border-transparent dark:bg-white dark:text-black dark:hover:bg-neutral-200",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
      </svg>
    ),
  },
  {
    key: "community" as const,
    label: "Zalo Group",
    shortLabel: "Zalo",
    colorClass: "bg-[#0068FF] hover:bg-[#0056d6] text-white border-transparent",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
      </svg>
    ),
  },
] as const;

export function JoinCommunityCta({ facebook, youtube, tiktok, community }: JoinCommunityCtaProps) {
  const links: Record<string, string | undefined> = { facebook, youtube, tiktok, community };

  return (
    <section className="relative overflow-hidden rounded-[28px]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/75 to-[#4D7CFF]/80 dark:from-[#EA580C]/80 dark:via-[#F7931A]/70 dark:to-[#FFD600]/60" />
      <div className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 15% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)" }}
      />
      {/* Wave SVG decoration */}
      <svg className="pointer-events-none absolute bottom-0 left-0 right-0 text-white/5" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
      </svg>

      <div className="relative z-10 p-8 md:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          {/* Left */}
          <div className="space-y-3 text-white">
            <div className="flex items-center gap-2">
              <Star className="size-4 fill-white/70 text-white/70" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Cộng đồng Arex</span>
            </div>
            <h2 className="font-heading text-3xl font-extrabold uppercase leading-tight md:text-4xl">
              SẴN SÀNG THAM GIA<br />CỘNG ĐỒNG?
            </h2>
            <p className="max-w-md text-sm font-medium leading-relaxed text-white/80 md:text-base">
              Kết nối cùng fan, theo dõi lịch sự kiện và nhận thông báo cập nhật mới nhất từ Arex.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Users className="size-4 text-white/60" />
              <span className="text-sm font-semibold text-white/80">Cùng tham gia cộng đồng ngay hôm nay</span>
            </div>
          </div>

          {/* Right — social buttons */}
          <div className="flex flex-wrap gap-3 md:shrink-0 md:justify-end">
            {socialButtons.map((btn) => {
              const href = links[btn.key];
              if (!href) return null;
              return (
                <a
                  key={btn.key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] shadow-md transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                    btn.colorClass,
                  ].join(" ")}
                >
                  {btn.icon}
                  <span className="hidden sm:inline">{btn.label}</span>
                  <span className="sm:hidden">{btn.shortLabel}</span>
                  <ExternalLink className="size-3 opacity-60" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
