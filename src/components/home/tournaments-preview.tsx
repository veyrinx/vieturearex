"use client";

import Link from "next/link";
import { ArrowRight, Trophy, Users, Swords, CalendarClock } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TmsTournament, TmsTeam } from "@/lib/tms/types";

type TournamentsPreviewProps = {
  tournaments: TmsTournament[];
  topTeams: TmsTeam[];
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  registering: { label: "Đang đăng ký", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  ongoing: { label: "Đang diễn ra", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  finished: { label: "Đã kết thúc", className: "bg-muted text-muted-foreground border border-border" },
};

const MODE_MAP: Record<string, string> = {
  "1v1": "1v1",
  "2v2": "2v2",
  "4v4": "4v4",
  squad: "Squad",
};

const SERVER_MAP: Record<string, string> = {
  vn: "VN",
  sg: "SG",
  global: "Global",
};

function TournamentCard({ t }: { t: TmsTournament }) {
  const status = STATUS_MAP[t.status] ?? STATUS_MAP.finished;
  const isOngoing = t.status === "ongoing";
  const isRegistering = t.status === "registering";

  return (
    <Link
      href={`/tournaments/${t.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl",
        isOngoing && "border-amber-500/30 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_24px_rgba(245,158,11,0.12)]",
        isRegistering && "border-emerald-500/30 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_24px_rgba(16,185,129,0.12)]",
        !isOngoing && !isRegistering && "border-border",
      )}
    >
      {/* Banner */}
      <div className="relative aspect-[16/7] overflow-hidden bg-muted">
        {t.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.banner_url}
            alt={t.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
        <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", status.className)}>
          {status.label}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-heading text-base font-black uppercase leading-tight text-foreground">
            {t.name}
          </h3>
          {t.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <Swords className="size-3" />
            {MODE_MAP[t.mode] ?? t.mode}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <Users className="size-3" />
            {t.max_teams} đội
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {SERVER_MAP[t.server] ?? t.server}
          </span>
        </div>

        {t.prize_pool && (
          <div className="flex items-center gap-1.5">
            <Trophy className="size-3.5 shrink-0 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{t.prize_pool}</span>
          </div>
        )}

        {t.start_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" />
            {new Date(t.start_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        )}
      </div>
    </Link>
  );
}

export function TournamentsPreview({ tournaments, topTeams }: TournamentsPreviewProps) {
  const active = tournaments.filter((t) => t.status === "registering" || t.status === "ongoing").slice(0, 3);
  const showTeams = topTeams.slice(0, 5);

  if (active.length === 0 && showTeams.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="TMS"
          title="GIẢI ĐẤU & ĐỘI TUYỂN"
          description="CÁC GIẢI ĐẤU ĐANG DIỄN RA VÀ TOP ĐỘI MẠNH NHẤT CỘNG ĐỒNG."
        />
        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
          <Link href="/tournaments">
            Xem tất cả
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      <div className={cn(
        "grid gap-6",
        showTeams.length > 0 ? "lg:grid-cols-[1fr_300px]" : "grid-cols-1",
      )}>
        {/* Tournaments */}
        {active.length > 0 && (
          <div className={cn("grid gap-4", active.length >= 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
            {active.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.05}>
                <TournamentCard t={t} />
              </Reveal>
            ))}
          </div>
        )}

        {/* Top Teams */}
        {showTeams.length > 0 && (
          <Reveal>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary dark:text-amber-400">
                  Bảng xếp hạng
                </p>
                <h3 className="mt-0.5 font-heading text-base font-black uppercase">TOP ĐỘI</h3>
              </div>
              <ul className="divide-y divide-border">
                {showTeams.map((team, idx) => (
                  <li key={team.id}>
                    <Link
                      href={`/teams/${team.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <span className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums",
                        idx === 0 && "bg-amber-400/20 text-amber-400",
                        idx === 1 && "bg-zinc-400/20 text-zinc-400",
                        idx === 2 && "bg-orange-700/20 text-orange-600",
                        idx > 2 && "bg-muted text-muted-foreground",
                      )}>
                        {idx + 1}
                      </span>
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.tag} className="size-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary">
                          {team.tag.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          <span className="text-muted-foreground">[{team.tag}]</span> {team.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">{team.total_kills} kills</p>
                      </div>
                      <span className="shrink-0 text-xs font-black tabular-nums text-primary dark:text-amber-400">
                        {team.total_points.toLocaleString("vi-VN")}
                        <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">pts</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-5 py-3">
                <Link
                  href="/leaderboard"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Xem tất cả đội <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
