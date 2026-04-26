import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays, BadgeCheck, ShieldCheck, Globe, Phone, Youtube, Instagram, Facebook,
  Eye, Trophy, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getUserPublicProfile } from "@/lib/data/content-service";
import { getRank } from "@/lib/constants/ranks";
import { cn } from "@/lib/utils";

type Props = { params: { id: string } };

const ROLE_META: Record<string, { label: string; color: string; gradient: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10 border-red-500/30", gradient: "from-red-500/30 via-rose-500/20 to-pink-500/15" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10 border-amber-500/30", gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/15" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10 border-violet-500/30", gradient: "from-violet-500/30 via-purple-500/20 to-fuchsia-500/15" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10 border-blue-500/30", gradient: "from-blue-500/30 via-indigo-500/20 to-cyan-500/15" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10 border-green-500/30", gradient: "from-green-500/30 via-emerald-500/20 to-teal-500/15" },
  team_member: { label: "Team",        color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30", gradient: "from-cyan-500/30 via-sky-500/20 to-blue-500/15" },
  user:        { label: "Thành Viên",  color: "text-muted-foreground bg-muted border-border", gradient: "from-muted to-muted/50" },
};

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

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z"/>
    </svg>
  );
}

const ONLINE_MS = 90_000;

export const revalidate = 120;

export default async function PublicProfilePage({ params }: Props) {
  const profile = await getUserPublicProfile(params.id);
  if (!profile) notFound();

  const name = profile.display_name || "Ẩn danh";
  const meta = ROLE_META[profile.role] ?? ROLE_META.user;
  const joinDate = format(new Date(profile.created_at), "dd 'tháng' MM, yyyy", { locale: vi });
  const points = Number(profile.points ?? 0);
  const rankMeta = getRank(points);
  const rankLabel = profile.rank ?? rankMeta.rank;
  const views = Number(profile.views ?? 0);
  const isOnline = profile.last_seen_at
    ? Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_MS
    : false;

  const socials = [
    { icon: Facebook, label: "Facebook", url: profile.facebook_url, color: "hover:text-[#1877F2] hover:border-[#1877F2]/40" },
    { icon: TikTokIcon, label: "TikTok", url: profile.tiktok_url, color: "hover:text-foreground hover:border-foreground/40" },
    { icon: Instagram, label: "Instagram", url: profile.instagram_url, color: "hover:text-[#E1306C] hover:border-[#E1306C]/40" },
    { icon: Youtube, label: "YouTube", url: profile.youtube_url, color: "hover:text-[#FF0000] hover:border-[#FF0000]/40" },
    { icon: Globe, label: "Website", url: profile.website_url, color: "hover:text-primary hover:border-primary/40" },
  ].filter((s) => s.url);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
        {/* Role gradient banner */}
        <div className={cn("h-32 bg-gradient-to-br", meta.gradient)} />

        <div className="px-6 pb-6 -mt-14">
          {/* Avatar */}
          <div className="relative mx-auto size-24 sm:mx-0">
            <div className="size-24 overflow-hidden rounded-full ring-4 ring-card">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={name} width={96} height={96} className="size-full object-cover" unoptimized />
              ) : (
                <div className={cn("flex size-full items-center justify-center bg-gradient-to-br text-3xl font-black text-white", avatarColor(profile.id))}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-1 right-1 flex size-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-4 rounded-full border-2 border-card bg-green-500" />
              </span>
            )}
          </div>

          {/* Name + role */}
          <div className="mt-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-heading text-2xl font-black uppercase tracking-[0.04em] text-foreground">
                {name}
              </h1>
              {profile.is_verified && (
                <BadgeCheck aria-label="Đã được xác minh" className="size-6 text-blue-500 dark:text-amber-400" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em]", meta.color)}>
                <ShieldCheck className="size-3" /> {meta.label}
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em]", rankMeta.bg, rankMeta.color)}>
                <Trophy className="size-3" /> {rankLabel}
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                  <span className="size-1.5 rounded-full bg-green-500" /> Trực tuyến
                </span>
              ) : null}
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <Stat icon={Sparkles} label="Điểm" value={points.toLocaleString("vi-VN")} accent="text-amber-500" />
            <Stat icon={Eye}      label="Lượt xem" value={views.toLocaleString("vi-VN")} accent="text-blue-500" />
            <Stat icon={CalendarDays} label="Tham gia" value={joinDate} accent="text-emerald-500" small />
          </div>

          {/* Contact row */}
          {profile.phone && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
              <Phone className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{profile.phone}</span>
            </div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Kênh liên kết
              </p>
              <div className="flex flex-wrap gap-2">
                {socials.map(({ icon: Icon, label, url, color }) => (
                  <Link
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition",
                      color,
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </Link>
                ))}
              </div>
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
      <p className={cn("font-bold text-foreground", small ? "text-xs" : "text-base")}>{value}</p>
    </div>
  );
}
