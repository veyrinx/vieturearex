"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicUserProfile } from "@/lib/types/content";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import { getRoleMeta, ROLE_ORDER } from "@/lib/constants/roles";
import { RoleBadge, VerifiedBadge } from "@/components/common/user-badges";

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-teal-600",
];

function getGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

const ONLINE_MS = 90_000;

function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_MS;
}

type Props = { profiles: PublicUserProfile[] };

export function TeamGrid({ profiles }: Props) {
  const [tick, setTick] = useState(0);

  // Re-check online status every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...profiles].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-muted-foreground">
        Chưa có thành viên nào.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((profile) => {
        const meta = getRoleMeta(profile.role);
        const online = isOnline(profile.last_seen_at);
        const gradient = getGradient(profile.id);
        const name = profile.display_name ?? "Thành viên";
        const joinYear = profile.created_at
          ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: vi })
          : null;

        const profileRecord = profile as unknown as Record<string, string | null | undefined>;
        const socials = SOCIAL_DEFS
          .map((s) => ({ ...s, href: profileRecord[s.field] }))
          .filter((s): s is typeof s & { href: string } => Boolean(s.href));

        return (
          <Link
            key={`${profile.id}-${tick}`}
            href={`/u/${profile.id}`}
            aria-label={`Xem hồ sơ ${name}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/40 dark:hover:border-amber-400/40"
          >
            <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-10" />

            {/* Top gradient band */}
            <div className={cn("h-20 bg-gradient-to-br opacity-80", gradient)} />

            {/* Avatar */}
            <div className="relative -mt-10 flex justify-center">
              <div
                className={cn(
                  "relative size-20 rounded-full ring-4 ring-background",
                  meta.ring && `ring-offset-1`,
                )}
              >
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={name}
                    fill
                    sizes="80px"
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "flex size-full items-center justify-center rounded-full bg-gradient-to-br text-2xl font-black text-white",
                      gradient,
                    )}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Online dot */}
                {online && (
                  <span className="absolute bottom-0.5 right-0.5 flex size-3.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-3.5 rounded-full border-2 border-background bg-green-500" />
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col items-center gap-2 px-5 pb-5 pt-3 text-center">
              {/* Name + verified */}
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading text-base font-bold tracking-[0.02em] text-foreground">
                  {name}
                </h3>
                <VerifiedBadge role={profile.role} isVerified={profile.is_verified} size="md" />
              </div>

              {/* Role badge */}
              <RoleBadge role={profile.role} size="md" bordered showMember className="px-3 tracking-[0.1em]" />

              {/* Online status text */}
              {online ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-green-500">
                  Đang trực tuyến
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.06em]">
                  Ngoại tuyến
                </p>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="mt-1 line-clamp-3 text-[0.78rem] leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Socials */}
              {socials.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {socials.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.field}
                        type="button"
                        aria-label={s.label}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(s.href, "_blank", "noopener,noreferrer");
                        }}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all",
                          s.brand,
                        )}
                      >
                        <Icon className="size-4" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Join date */}
              {joinYear && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <CalendarDays className="size-3 shrink-0" />
                  <span>Tham gia {joinYear}</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
