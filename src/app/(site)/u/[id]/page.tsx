import { notFound } from "next/navigation";
import Image from "next/image";
import { CalendarDays, BadgeCheck, ShieldCheck } from "lucide-react";
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

export const revalidate = 120;

export default async function PublicProfilePage({ params }: Props) {
  const profile = await getUserPublicProfile(params.id);
  if (!profile) notFound();

  const name = profile.display_name || "Ẩn danh";
  const meta = ROLE_META[profile.role] ?? ROLE_META.user;
  const joinDate = format(new Date(profile.created_at), "MMMM yyyy", { locale: vi });

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10 pb-16">
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={name}
            width={88}
            height={88}
            className="size-[88px] rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className={cn(
            "flex size-[88px] items-center justify-center rounded-full bg-gradient-to-br text-3xl font-bold text-white",
            avatarColor(profile.id),
          )}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
            {profile.is_verified && (
              <BadgeCheck className="size-5 text-[#0052ff] dark:text-amber-400" />
            )}
          </div>

          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.06em]",
            meta.color,
          )}>
            <ShieldCheck className="size-3" />
            {meta.label}
          </span>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Tham gia {joinDate}
          </p>
        </div>
      </div>
    </div>
  );
}
