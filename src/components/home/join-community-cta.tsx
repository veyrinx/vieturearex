import { ExternalLink, ArrowUpRight } from "lucide-react";

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
  accentClass: string;
  borderClass: string;
  statLabel: string;
  icon: React.ReactNode;
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: "facebook",
    label: "Facebook",
    accentClass: "bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1877F2]/15",
    borderClass: "hover:border-[#1877F2]/50",
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
    accentClass: "bg-[#FF0000]/10 text-[#FF0000] dark:bg-[#FF0000]/15",
    borderClass: "hover:border-[#FF0000]/50",
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
    accentClass: "bg-foreground/10 text-foreground dark:bg-white/10 dark:text-white",
    borderClass: "hover:border-foreground/40",
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
    accentClass: "bg-[#0068FF]/10 text-[#0068FF] dark:bg-[#0068FF]/15",
    borderClass: "hover:border-[#0068FF]/50",
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
    <section className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-primary dark:bg-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary dark:text-amber-400">
              Cộng đồng
            </span>
          </div>
          <h2 className="font-heading text-3xl font-black uppercase md:text-4xl">
            KẾT NỐI VỚI AREX
          </h2>
          <p className="text-sm text-muted-foreground">
            Tham gia cộng đồng Free Fire — cập nhật sự kiện, theo dõi tin tức và giao lưu cùng mọi người.
          </p>
        </div>

        {daysActive !== null && daysActive !== undefined && (
          <div className="shrink-0 rounded-2xl border border-border bg-card px-5 py-3.5 text-center">
            <p className="font-heading text-4xl font-black tabular-nums text-primary dark:text-amber-400">
              {Number(daysActive ?? 0).toLocaleString("vi-VN")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
                "group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                platform.borderClass,
              ].join(" ")}
            >
              {/* Top row: icon + arrow */}
              <div className="flex items-start justify-between">
                <div className={["flex size-10 items-center justify-center rounded-xl", platform.accentClass].join(" ")}>
                  {platform.icon}
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {platform.label}
                </span>
                <ExternalLink className="size-3 text-muted-foreground/50" />
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] scale-x-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-300 group-hover:scale-x-100 dark:via-amber-400" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
