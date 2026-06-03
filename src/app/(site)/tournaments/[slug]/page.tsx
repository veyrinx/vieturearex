import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, CalendarDays, Swords, ClipboardList, BarChart2, ArrowLeft, Zap } from "lucide-react";
import { getTmsTournament, getTmsRegistrations, getTmsMatches } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { RegisterButton } from "@/components/tms/register-button";
import { TournamentBracket } from "@/components/tms/bracket";
import { StreamEmbed } from "@/components/tms/stream-embed";
import { TmsServerBadge } from "@/components/tms/server-badge";
import { TeamLogo, TournamentBanner } from "@/components/common/safe-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTmsTournament(slug).catch(() => null);
  return { title: t ? `${t.name} | Arex TMS` : "Giải Đấu" };
}

const statusColor: Record<string, string> = {
  pending:   "text-muted-foreground",
  playing:   "text-amber-400",
  done:      "text-emerald-400",
  cancelled: "text-red-400",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi });
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getTmsTournament(slug).catch(() => null);
  if (!tournament) notFound();

  const [regs, allMatches] = await Promise.all([
    getTmsRegistrations(tournament.id).catch(() => []),
    getTmsMatches(tournament.id).catch(() => []),
  ]);

  const approvedTeams = regs.filter((r) => r.status === "approved");

  const isRegistering = tournament.status === "registering";
  const isOngoing = tournament.status === "ongoing";

  return (
    <div className="py-8 space-y-6">
      {/* Back */}
      <Link href="/tournaments"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Giải đấu
      </Link>

      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card"
        style={isOngoing ? { boxShadow: "0 0 0 1px rgba(245,158,11,0.2), 0 8px 40px rgba(245,158,11,0.12)" }
          : isRegistering ? { boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 8px 40px rgba(16,185,129,0.1)" } : undefined}>

        {/* Banner with overlay */}
        <div className="relative aspect-[21/7] overflow-hidden bg-muted">
          <TournamentBanner src={tournament.banner_url} alt={tournament.name} className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Status badges */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className={cn("rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
              isOngoing ? "border-amber-500/60 bg-amber-500/20 text-amber-400"
              : isRegistering ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
              : "border-muted-foreground/30 bg-black/40 text-muted-foreground"
            )}>
              {STATUS_LABELS[tournament.status]}
            </span>
            {tournament.auto_approve_registrations && isRegistering && (
              <span className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-black/40 px-2 py-1 text-[9px] font-bold text-emerald-400">
                <Zap className="size-2.5" /> Tự duyệt
              </span>
            )}
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
            <h1 className="font-heading text-2xl font-black uppercase tracking-[0.04em] text-white drop-shadow-md md:text-3xl">
              {tournament.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <TmsServerBadge server={tournament.server} variant="full" />
              <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[tournament.mode]}</span>
              <span className="flex items-center gap-1"><ClipboardList className="size-3" />{FORMAT_LABELS[tournament.format]}</span>
              <span className="flex items-center gap-1"><Users className="size-3" />{approvedTeams.length}/{tournament.max_teams} teams</span>
              {tournament.prize_pool && (
                <span className="flex items-center gap-1 font-bold text-amber-400"><Trophy className="size-3" />{tournament.prize_pool}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          <RegisterButton tournamentId={tournament.id} tournamentStatus={tournament.status} slug={slug} />
          <Link href={`/tournaments/${slug}/leaderboard`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary/40 transition-colors">
            <BarChart2 className="size-3.5" /> Bảng xếp hạng
          </Link>
          <a href={`/api/tms/tournaments/${tournament.id}/image/standings`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary/40 transition-colors">
            <BarChart2 className="size-3.5" /> 🖼 Ảnh BXH
          </a>
          <Link href={`/tournaments/${slug}/submit`}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary hover:border-primary/60 transition-colors dark:border-amber-400/40 dark:bg-amber-400/8 dark:text-amber-400">
            <Trophy className="size-3.5" /> Nộp kết quả
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Trạng thái",  value: STATUS_LABELS[tournament.status], color: isOngoing ? "text-amber-400" : isRegistering ? "text-emerald-400" : "text-muted-foreground" },
          { label: "Đăng ký",     value: `${fmtDate(tournament.registration_open_at)} → ${fmtDate(tournament.registration_close_at)}`, color: "text-foreground" },
          { label: "Thi đấu",     value: `${fmtDate(tournament.start_at)} → ${fmtDate(tournament.end_at)}`, color: "text-foreground" },
          { label: "Giải thưởng", value: tournament.prize_pool ?? "—", color: tournament.prize_pool ? "text-amber-400 font-bold" : "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-sm leading-snug", color)}>{value}</p>
          </div>
        ))}
      </div>

      {tournament.description && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
        </div>
      )}

      {/* Livestream embed */}
      {tournament.stream_url && <StreamEmbed url={tournament.stream_url} />}

      {/* Teams */}
      {approvedTeams.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Users className="size-3.5" /> Teams tham dự ({approvedTeams.length})
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {approvedTeams.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                <TeamLogo src={r.team?.logo_url} tag={r.team?.tag ?? "?"} className="size-8 rounded-lg" />
                <div>
                  <p className="text-sm font-semibold leading-none">{r.team?.name}</p>
                  <p className="text-[10px] text-muted-foreground">[{r.team?.tag}]{r.group_label ? ` • Bảng ${r.group_label}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live bracket */}
      {allMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Trophy className="size-3.5" /> Bracket ({allMatches.length} trận)
            </h2>
          </div>
          <TournamentBracket matches={allMatches} />
        </section>
      )}

      {tournament.rules && (
        <section className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">Luật thi đấu</h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {tournament.rules}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" />
        <span>Tạo lúc {fmtDate(tournament.created_at)}</span>
      </div>
    </div>
  );
}
