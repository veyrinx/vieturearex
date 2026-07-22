import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays, Phone, Mail, Eye, Trophy, Sparkles, Gamepad2,
} from "lucide-react";
import { getRoleMeta } from "@/lib/constants/roles";
import { RoleBadge, UserBadgeList, VerifiedBadge } from "@/components/common/user-badges";
import { isSectionVisible } from "@/lib/constants/profile-privacy";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getUserPublicProfile } from "@/lib/data/content-service";
import { getRank, getSubRank, getRankProgress, getPointsToNextRank } from "@/lib/constants/ranks";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import { GAME_META_BY_KEY } from "@/lib/constants/game-list";
import { ProfileActions } from "@/components/profile/profile-actions";
import { siteConfig } from "@/lib/constants/site";
import type { GameProfile } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { AchievementBadges } from "@/components/profile/achievement-badges";
import { getMergedAchievementsById, resolveEarned } from "@/lib/server/achievements";

type Props = { params: Promise<{ id: string }> };

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const ONLINE_MS = 90_000;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getUserPublicProfile(id);
  if (!profile) return { title: "Người dùng không tồn tại" };

  const name = profile.display_name ?? "Ẩn danh";
  const rank = profile.rank ?? getRank(profile.points ?? 0).rank;
  const url = `${siteConfig.url}/u/${id}`;
  const description = profile.bio
    ? `${profile.bio} — Hạng ${rank} · ${(profile.points ?? 0).toLocaleString("vi-VN")} điểm`
    : `Hồ sơ của ${name} trên Arex. Hạng: ${rank}.`;

  return {
    title: `${name} — Hồ sơ`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} · Arex`,
      description,
      url,
      type: "profile",
      siteName: siteConfig.name,
      locale: "vi_VN",
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, width: 400, height: 400, alt: name }],
      }),
    },
    twitter: {
      card: profile.avatar_url ? "summary" : "summary",
      title: `${name} · Arex`,
      description,
      ...(profile.avatar_url && { images: [profile.avatar_url] }),
    },
  };
}

export const revalidate = 120;

async function getPublicAchievements(userId: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return [];
  const { data } = await untypedFrom(admin, "user_achievements")
    .select("achievement, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true }) as { data: { achievement: string; earned_at: string }[] | null };
  return data ?? [];
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const [profile, achievements, achievementsById] = await Promise.all([
    getUserPublicProfile(id),
    getPublicAchievements(id),
    getMergedAchievementsById(),
  ]);
  if (!profile) notFound();

  const earnedBadges = resolveEarned(achievements, achievementsById);

  const name = profile.display_name || "Ẩn danh";
  const meta = getRoleMeta(profile.role);
  const joinDate = format(new Date(profile.created_at), "dd 'tháng' MM, yyyy", { locale: vi });
  const profileUrl = `${siteConfig.url}/u/${profile.id}`;
  const points = Number(profile.points ?? 0);
  const rankMeta = getRank(points);
  const subRank = getSubRank(points);
  const rankProgress = getRankProgress(points);
  const pointsToNext = getPointsToNextRank(points);
  const rankLabel = `${profile.rank ?? rankMeta.rank} ${subRank}`;
  const views = Number(profile.views ?? 0);
  const isOnline = profile.last_seen_at
    ? Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_MS
    : false;
  const show = (key: Parameters<typeof isSectionVisible>[1]) => isSectionVisible(profile.privacy, key);

  const profileRecord = profile as unknown as Record<string, string | null | undefined>;
  const socials = SOCIAL_DEFS
    .map((s) => ({ ...s, url: profileRecord[s.field] }))
    .filter((s) => Boolean(s.url));
  const games = (Array.isArray(profile.game_profiles) ? profile.game_profiles : []) as GameProfile[];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      {/* Hero card */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">

        {/* ── Banner ── */}
        <div className="relative h-48 sm:h-56">
          {profile.banner_url ? (
            <Image src={profile.banner_url} alt="Banner" fill className="object-cover" unoptimized />
          ) : (
            <>
              <div className={cn("absolute inset-0 bg-gradient-to-br", meta.gradient)} />
              {/* Noise grain */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.15]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
              />
            </>
          )}
          {/* Radial vignette */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
        </div>

        {/* ── Profile info ── */}
        <div className="px-6 pb-6 -mt-16 sm:-mt-20">

          {/* Avatar */}
          <div className="relative mx-auto size-28 sm:mx-0 sm:size-32">
            <div className="relative size-full overflow-hidden rounded-full ring-4 ring-card shadow-xl">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={name} fill className="object-cover" unoptimized />
              ) : (
                <div className={cn("flex size-full items-center justify-center bg-gradient-to-br text-4xl font-black text-white", avatarColor(profile.id))}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-1.5 right-1.5 flex size-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-4 rounded-full border-2 border-card bg-green-500" />
              </span>
            )}
          </div>

          {/* Name + badges */}
          <div className="mt-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-heading text-2xl font-black uppercase tracking-[0.04em] text-foreground">
                {name}
              </h1>
              <VerifiedBadge role={profile.role} badges={profile.badges} isVerified={profile.is_verified} size="lg" className="size-6" />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RoleBadge role={profile.role} size="lg" showMember bordered className="tracking-[0.06em]" />
              <UserBadgeList badges={profile.badges} size="lg" bordered className="gap-2" />
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em]", rankMeta.bg, rankMeta.color)}>
                <span className="text-sm leading-none">{rankMeta.icon}</span>
                {rankLabel}
              </span>
              {isOnline && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                  <span className="size-1.5 rounded-full bg-green-500" /> Trực tuyến
                </span>
              )}
            </div>

            {profile.bio && show("bio") && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Follow + Share */}
          <ProfileActions targetUserId={profile.id} profileUrl={profileUrl} title={`Hồ sơ ${name} — Arex`} />

          {/* Rank progress */}
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn("text-xs font-bold", rankMeta.color)}>{rankMeta.icon} {rankLabel}</span>
              <span className="text-[10px] text-muted-foreground">
                {pointsToNext != null ? `còn ${pointsToNext.toLocaleString("vi-VN")} điểm` : "Hạng tối đa"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", rankMeta.color.replace("text-", "bg-"))}
                style={{ width: `${rankProgress}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Stat icon={Sparkles} label="Điểm" value={points > 999999 ? `${(points/1000000).toFixed(1)}M` : points > 9999 ? `${(points/1000).toFixed(1)}K` : points.toLocaleString("vi-VN")} accent="text-amber-500" />
            <Stat icon={Eye} label="Xem" value={views > 999999 ? `${(views/1000000).toFixed(1)}M` : views > 9999 ? `${(views/1000).toFixed(1)}K` : views.toLocaleString("vi-VN")} accent="text-blue-500" />
            <Stat icon={CalendarDays} label="Tham gia" value={joinDate} accent="text-emerald-500" small />
          </div>

          {/* Contact rows */}
          {show("contact") && (profile.phone || profile.contact_email) && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 transition hover:border-primary/40 hover:bg-muted/60"
                >
                  <Phone className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{profile.phone}</span>
                </a>
              )}
              {profile.contact_email && (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 transition hover:border-primary/40 hover:bg-muted/60"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">{profile.contact_email}</span>
                </a>
              )}
            </div>
          )}

          {/* Games */}
          {show("games") && games.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Gamepad2 className="size-3" /> Game đang chơi
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {games.map((g, i) => {
                  const meta = GAME_META_BY_KEY[g.game];
                  const label = meta?.label ?? g.custom_label ?? g.game;
                  const short = meta?.short ?? (g.custom_label ?? g.game).slice(0, 3).toUpperCase();
                  return (
                    <div key={`${g.game}-${i}`} className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-black text-primary dark:from-amber-400/20 dark:to-amber-400/5 dark:text-amber-400">
                        {short}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{label}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {g.nickname ? `${g.nickname} · ` : ""}{g.uid}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Socials */}
          {show("socials") && socials.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Kênh liên kết
              </p>
              <div className="flex flex-wrap gap-2">
                {socials.map(({ icon: Icon, label, url, brand }) => (
                  <Link
                    key={label}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition",
                      brand,
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Achievements — dải huy hiệu icon, bấm để xem tên */}
          {show("achievements") && earnedBadges.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Trophy className="size-3" /> Thành tích ({earnedBadges.length})
              </p>
              <AchievementBadges items={earnedBadges} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent, small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/40 px-3 py-3">
      <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground", accent)}>
        <Icon className="size-3" /> {label}
      </div>
      <p className={cn("font-bold text-foreground truncate", small ? "text-xs leading-snug" : "text-sm leading-snug")}>{value}</p>
    </div>
  );
}
