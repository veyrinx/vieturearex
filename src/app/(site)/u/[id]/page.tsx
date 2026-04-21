import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, BadgeCheck, ShieldCheck, Globe, Phone, Youtube, Instagram, Facebook } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getUserPublicProfile } from "@/lib/data/content-service";
import { cn } from "@/lib/utils";

type Props = { params: { id: string } };

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10 border-violet-500/30" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10 border-green-500/30" },
  user:        { label: "Thành Viên",  color: "text-muted-foreground bg-muted border-border" },
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

export const revalidate = 120;

export default async function PublicProfilePage({ params }: Props) {
  const profile = await getUserPublicProfile(params.id);
  if (!profile) notFound();

  const name = profile.display_name || "Ẩn danh";
  const meta = ROLE_META[profile.role] ?? ROLE_META.user;
  const joinDate = format(new Date(profile.created_at), "MMMM yyyy", { locale: vi });

  const socials = [
    { icon: Facebook, label: "Facebook", url: profile.facebook_url },
    { icon: TikTokIcon, label: "TikTok", url: profile.tiktok_url },
    { icon: Instagram, label: "Instagram", url: profile.instagram_url },
    { icon: Youtube, label: "YouTube", url: profile.youtube_url },
    { icon: Globe, label: "Website", url: profile.website_url },
  ].filter((s) => s.url);

  return (
    <div className="mx-auto max-w-md space-y-4 pt-10 pb-16">
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={name} width={88} height={88} className="size-[88px] rounded-full object-cover ring-2 ring-border" unoptimized />
        ) : (
          <div className={cn("flex size-[88px] items-center justify-center rounded-full bg-gradient-to-br text-3xl font-bold text-white", avatarColor(profile.id))}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
            {profile.is_verified && <BadgeCheck className="size-5 text-[#0052ff] dark:text-amber-400" />}
          </div>

          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.06em]", meta.color)}>
            <ShieldCheck className="size-3" /> {meta.label}
          </span>

          {profile.bio && (
            <p className="text-sm text-muted-foreground max-w-xs">{profile.bio}</p>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> Tham gia {joinDate}
          </p>

          {profile.phone && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3.5" /> {profile.phone}
            </p>
          )}
        </div>

        {socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {socials.map(({ icon: Icon, label, url }) => (
              <Link
                key={label}
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground hover:bg-muted"
              >
                <Icon className="size-3.5" /> {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
