import { ExternalLink } from "lucide-react";

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
    colorClass: "bg-[#1877F2] hover:bg-[#0e65d4] text-white border-[#1877F2]",
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
    colorClass: "bg-[#FF0000] hover:bg-[#cc0000] text-white border-[#FF0000]",
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
    colorClass: "bg-black hover:bg-neutral-800 text-white border-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:border-white",
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
    colorClass: "bg-[#0068FF] hover:bg-[#0056d6] text-white border-[#0068FF]",
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
    <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-r from-primary/10 via-[#4D7CFF]/10 to-card/90 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-10 dark:border-primary/20 dark:from-[#EA580C]/12 dark:via-[#F7931A]/12 dark:to-[#FFD600]/10 dark:shadow-[0_0_50px_-10px_rgba(247,147,26,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,82,255,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(247,147,26,0.18),transparent_50%)]" />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            SẴN SÀNG THAM GIA CỘNG ĐỒNG?
          </h2>
          <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground md:text-base">
            KẾT NỐI CÙNG FAN, THEO DÕI LỊCH EVENT VÀ NHẬN THÔNG BÁO CẬP NHẬT MỚI NHẤT.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 md:shrink-0">
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
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                  btn.colorClass,
                ].join(" ")}
              >
                {btn.icon}
                <span className="hidden sm:inline">{btn.label}</span>
                <span className="sm:hidden">{btn.shortLabel}</span>
                <ExternalLink className="size-3 opacity-70" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
