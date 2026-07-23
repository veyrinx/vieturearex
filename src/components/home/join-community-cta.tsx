import { ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/home/stats-bar";

type JoinCommunityCtaProps = {
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  community?: string;
  daysActive?: number | null;
  facebookMembers?: string | null;
  youtubeSubscribers?: string | null;
  tiktokFollowers?: string | null;
  zaloMembers?: string | null;
};

type PlatformConfig = {
  key: "facebook" | "youtube" | "tiktok" | "community";
  label: string;
  accentBg: string;
  accentText: string;
  glowColor: string;
  statLabel: string;
  icon: React.ReactNode;
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: "facebook",
    label: "Facebook",
    accentBg: "bg-[#1877F2]/10 dark:bg-[#1877F2]/15",
    accentText: "text-[#1877F2]",
    glowColor: "hover:shadow-[0_4px_24px_rgba(24,119,242,0.18)] hover:border-[#1877F2]/40",
    statLabel: "thành viên",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    accentBg: "bg-[#FF0000]/10 dark:bg-[#FF0000]/15",
    accentText: "text-[#FF0000]",
    glowColor: "hover:shadow-[0_4px_24px_rgba(255,0,0,0.15)] hover:border-[#FF0000]/40",
    statLabel: "subscribers",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "tiktok",
    label: "TikTok",
    accentBg: "bg-foreground/8 dark:bg-white/10",
    accentText: "text-foreground dark:text-white",
    glowColor: "hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:border-foreground/30",
    statLabel: "followers",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
      </svg>
    ),
  },
  {
    key: "community",
    label: "Zalo Group",
    accentBg: "bg-[#0068FF]/10 dark:bg-[#0068FF]/15",
    accentText: "text-[#0068FF]",
    glowColor: "hover:shadow-[0_4px_24px_rgba(0,104,255,0.18)] hover:border-[#0068FF]/40",
    statLabel: "thành viên",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
      </svg>
    ),
  },
];

const STAT_MAP: Record<string, (props: JoinCommunityCtaProps) => string | null | undefined> = {
  facebook: (p) => p.facebookMembers,
  youtube: (p) => p.youtubeSubscribers,
  tiktok: (p) => p.tiktokFollowers,
  community: (p) => p.zaloMembers,
};

const LINK_MAP: Record<string, (props: JoinCommunityCtaProps) => string | undefined> = {
  facebook: (p) => p.facebook,
  youtube: (p) => p.youtube,
  tiktok: (p) => p.tiktok,
  community: (p) => p.community,
};

export function JoinCommunityCta(props: JoinCommunityCtaProps) {
  const { daysActive } = props;
  const activePlatforms = PLATFORMS.filter((p) => !!LINK_MAP[p.key](props));

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      {/* Subtle mesh background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, hsl(var(--primary)) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(var(--primary)) 0%, transparent 50%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent dark:via-amber-400/30" />

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-primary dark:bg-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary dark:text-amber-400">
                Cộng đồng
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent dark:from-amber-400/30" />
            </div>
            <h2 className="font-heading text-3xl font-black uppercase tracking-[0.03em] text-foreground md:text-4xl">
              KẾT NỐI VỚI AREX
            </h2>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Tham gia cộng đồng Free Fire — cập nhật sự kiện, theo dõi tin tức và giao lưu cùng mọi người.
            </p>
          </div>

          {daysActive !== null && daysActive !== undefined && (
            <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 text-center dark:border-amber-400/20 dark:bg-amber-400/5">
              <p className="font-heading text-4xl font-black tabular-nums text-primary dark:text-amber-400">
                <CountUp target={Number(daysActive ?? 0)} />
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                ngày hoạt động
              </p>
            </div>
          )}
        </div>

        {/* Platform grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {activePlatforms.map((platform) => {
            const href = LINK_MAP[platform.key](props)!;
            const stat = STAT_MAP[platform.key](props);

            return (
              <a
                key={platform.key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={[
                  "group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border bg-background/60 p-5 transition-all duration-200 hover:-translate-y-0.5",
                  platform.glowColor,
                ].join(" ")}
              >
                {/* Top accent line on hover */}
                <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100" />

                {/* Top row: icon + arrow */}
                <div className="flex items-start justify-between">
                  <div className={["flex size-10 items-center justify-center rounded-xl", platform.accentBg, platform.accentText].join(" ")}>
                    {platform.icon}
                  </div>
                  <ArrowUpRight className={["size-4 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5", platform.accentText].join(" ")} />
                </div>

                {/* Stat */}
                {stat ? (
                  <div>
                    <p className="font-heading text-2xl font-black tabular-nums text-foreground leading-none">
                      {stat}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {platform.statLabel}
                    </p>
                  </div>
                ) : (
                  <p className="font-heading text-base font-bold uppercase text-foreground">
                    {platform.label}
                  </p>
                )}

                {/* Label */}
                <div className="flex items-center gap-1.5">
                  <span className={["text-xs font-bold uppercase tracking-[0.1em]", platform.accentText].join(" ")}>
                    {platform.label}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
