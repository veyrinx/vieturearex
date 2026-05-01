import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, CalendarDays, Swords, ClipboardList, BarChart2 } from "lucide-react";
import { getTmsTournament, getTmsRegistrations, getTmsMatches } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS, MATCH_STATUS_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTmsTournament(slug).catch(() => null);
  return { title: t ? `${t.name} | Arex TMS` : "Giải Đấu" };
}

const statusColor: Record<string, string> = {
  pending: "text-muted-foreground",
  playing: "text-amber-400",
  done: "text-emerald-400",
  cancelled: "text-red-400",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi });
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tournament, registrations, matches] = await Promise.all([
    getTmsTournament(slug),
    (async () => { try { const t = await getTmsTournament(slug); return t ? getTmsRegistrations(t.id) : []; } catch { return []; } })(),
    (async () => { try { const t = await getTmsTournament(slug); return t ? getTmsMatches(t.id) : []; } catch { return []; } })(),
  ]);

  if (!tournament) notFound();

  const regs = await getTmsRegistrations(tournament.id).catch(() => []);
  const approvedTeams = regs.filter((r) => r.status === "approved");
  const allMatches = await getTmsMatches(tournament.id).catch(() => []);
  void registrations; void matches;

  return (
    <div className="py-10 space-y-8">
      {/* Hero */}
      {tournament.banner_url && (
        <div className="rounded-2xl overflow-hidden aspect-[21/6] bg-muted">
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">{tournament.name}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[tournament.mode]}</span>
            <span className="flex items-center gap-1"><ClipboardList className="size-3" />{FORMAT_LABELS[tournament.format]}</span>
            <span className="flex items-center gap-1"><Users className="size-3" />{approvedTeams.length} / {tournament.max_teams} teams</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/tournaments/${slug}/leaderboard`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary/40 transition-colors">
            <BarChart2 className="size-3.5" /> Bảng xếp hạng
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Trạng thái", value: STATUS_LABELS[tournament.status] },
          { label: "Đăng ký", value: `${fmtDate(tournament.registration_open_at)} → ${fmtDate(tournament.registration_close_at)}` },
          { label: "Thi đấu", value: `${fmtDate(tournament.start_at)} → ${fmtDate(tournament.end_at)}` },
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

      {/* Matches */}
      {allMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-bold uppercase tracking-widest flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" /> Lịch thi đấu ({allMatches.length})
          </h2>
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">Vòng</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">Trận</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">Giờ</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">Trạng thái</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">Thắng</th>
                </tr>
              </thead>
              <tbody>
                {allMatches.map((m) => (
                  <tr key={m.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{m.round}</td>
                    <td className="px-3 py-2 font-semibold">
                      <span>{m.team_a?.name ?? "?"}</span>
                      <span className="mx-1.5 text-muted-foreground">vs</span>
                      <span>{m.team_b?.name ?? "?"}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(m.scheduled_at)}</td>
                    <td className={cn("px-3 py-2 text-xs font-semibold", statusColor[m.status])}>{MATCH_STATUS_LABELS[m.status]}</td>
                    <td className="px-3 py-2 text-xs font-bold text-amber-400">
                      {m.winner_id ? (m.winner?.name ?? (m.winner_id === m.team_a_id ? m.team_a?.name : m.team_b?.name) ?? "—") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
