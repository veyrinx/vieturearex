import { ExternalLink, Calendar, Users } from "lucide-react";

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
  shortLabel: string;
  colorClass: string;
  statLabel: string;
  icon: React.ReactNode;
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: "facebook",
    label: "Facebook",
    shortLabel: "FB",
    colorClass: "bg-[#1877F2] hover:bg-[#0e65d4] text-white",
    statLabel: "thành viên",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    shortLabel: "YT",
    colorClass: "bg-[#FF0000] hover:bg-[#cc0000] text-white",
    statLabel: "subscribers",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "tiktok",
    label: "TikTok",
    shortLabel: "TT",
    colorClass: "bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200",
    statLabel: "followers",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
      </svg>
    ),
  },
  {
    key: "community",
    label: "Zalo Group",
    shortLabel: "Zalo",
    colorClass: "bg-[#0068FF] hover:bg-[#0056d6] text-white",
    statLabel: "thành viên",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
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

  return (
    <section className="relative overflow-hidden rounded-[28px]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-[#4D7CFF] dark:from-[#EA580C] dark:via-[#F7931A]/90 dark:to-[#FFD600]/80" />
      {/* Dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      {/* Radial glow spots */}
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(ellipse at 10% 60%, rgba(255,255,255,0.18) 0%, transparent 45%), radial-gradient(ellipse at 90% 15%, rgba(255,255,255,0.12) 0%, transparent 40%)" }}
      />
      {/* Wave decoration */}
      <svg className="pointer-events-none absolute bottom-0 left-0 right-0 text-white/[0.06]" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0,50 C240,100 480,0 720,50 C960,100 1200,0 1440,50 L1440,100 L0,100 Z" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative z-10 px-6 py-10 md:px-10 md:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 text-white sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Users className="size-3.5 fill-white/80 text-white/80" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Cộng đồng Arex</span>
            </div>
            <h2 className="font-heading text-3xl font-extrabold uppercase leading-tight drop-shadow-md md:text-4xl lg:text-5xl">
              THAM GIA<br />
              <span className="text-white/90">CỘNG ĐỒNG?</span>
            </h2>
            <p className="max-w-md text-sm font-medium leading-relaxed text-white/75 md:text-base">
              Kết nối cùng fan, theo dõi sự kiện và nhận thông báo mới nhất từ Arex.
            </p>
          </div>

          {/* Days active badge */}
          {daysActive !== null && daysActive !== undefined && (
            <div className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-white backdrop-blur-sm sm:text-center">
              <Calendar className="size-5 text-white/70" />
              <p className="font-heading text-4xl font-extrabold leading-none tabular-nums drop-shadow">
                {daysActive.toLocaleString("vi-VN")}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">ngày hoạt động</p>
            </div>
          )}
        </div>

        {/* 4 platform cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLATFORMS.map((platform) => {
            const href = LINK_MAP[platform.key](props);
            if (!href) return null;
            const stat = STAT_MAP[platform.key](props);

            return (
              <a
                key={platform.key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-4 py-5 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Platform icon */}
                <div className={["flex size-12 items-center justify-center rounded-xl shadow-lg transition-transform duration-200 group-hover:scale-110", platform.colorClass].join(" ")}>
                  {platform.icon}
                </div>

                {/* Stat number */}
                {stat ? (
                  <div className="text-center">
                    <p className="font-heading text-2xl font-extrabold leading-none tabular-nums drop-shadow">
                      {stat}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                      {platform.statLabel}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-heading text-base font-bold uppercase">{platform.label}</p>
                  </div>
                )}

                {/* Platform label + arrow */}
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/70">
                  {platform.label}
                  <ExternalLink className="size-3 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
