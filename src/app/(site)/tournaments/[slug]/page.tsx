import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, CalendarDays, Swords, ClipboardList, BarChart2 } from "lucide-react";
import { getTmsTournament, getTmsRegistrations, getTmsMatches } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { RegisterButton } from "@/components/tms/register-button";
import { TournamentBracket } from "@/components/tms/bracket";
import { StreamEmbed } from "@/components/tms/stream-embed";
import { SERVER_LABELS } from "@/lib/tms/types";

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

  return (
    <div className="py-10 space-y-8">
      {/* Banner */}
      {tournament.banner_url && (
        <div className="rounded-2xl overflow-hidden aspect-[21/6] bg-muted">
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title + actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">{tournament.name}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">{SERVER_LABELS[tournament.server] ?? tournament.server}</span>
            <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[tournament.mode]}</span>
            <span className="flex items-center gap-1"><ClipboardList className="size-3" />{FORMAT_LABELS[tournament.format]}</span>
            <span className="flex items-center gap-1"><Users className="size-3" />{approvedTeams.length} / {tournament.max_teams} teams</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegisterButton
            tournamentId={tournament.id}
            tournamentStatus={tournament.status}
            slug={slug}
          />
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

      {/* Livestream embed */}
      {tournament.stream_url && <StreamEmbed url={tournament.stream_url} />}

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Trạng thái",  value: STATUS_LABELS[tournament.status] },
          { label: "Đăng ký",     value: `${fmtDate(tournament.registration_open_at)} → ${fmtDate(tournament.registration_close_at)}` },
          { label: "Thi đấu",     value: `${fmtDate(tournament.start_at)} → ${fmtDate(tournament.end_at)}` },
          { label: "Giải thưởng", value: tournament.prize_pool ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {tournament.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
      )}

      {/* Teams */}
      {approvedTeams.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-bold uppercase tracking-widest flex items-center gap-2">
            <Users className="size-4 text-primary" /> Teams tham dự ({approvedTeams.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {approvedTeams.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                {r.team?.logo_url
                  ? <img src={r.team.logo_url} alt={r.team?.name} className="size-8 rounded-lg object-cover" />
                  : <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{r.team?.tag?.slice(0, 2)}</div>
                }
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
          <h2 className="font-heading text-base font-bold uppercase tracking-widest flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" /> Bracket ({allMatches.length} trận)
          </h2>
          <TournamentBracket matches={allMatches} />
        </section>
      )}

      {tournament.rules && (
        <section className="space-y-2">
          <h2 className="font-heading text-base font-bold uppercase tracking-widest">Luật thi đấu</h2>
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
