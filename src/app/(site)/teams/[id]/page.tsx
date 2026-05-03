import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shield, Users, Trophy, Swords, Target, TrendingUp, Star, CalendarDays, Crown } from "lucide-react";
import {
  getTmsTeam, getTmsTeamMembers, getTmsTeamMatchHistory,
  getTmsTeamResultsByTournament,
} from "@/lib/tms/data";
import type { TeamLeaderboardWithTournament } from "@/lib/tms/data";
import { MATCH_STATUS_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const team = await getTmsTeam(id).catch(() => null);
  return { title: team ? `[${team.tag}] ${team.name} | Arex TMS` : "Đội" };
}

const MATCH_STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-foreground",
  playing: "text-amber-400",
  done: "text-emerald-400",
  cancelled: "text-red-400",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi });
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [team, members, matches, tournamentStats] = await Promise.all([
    getTmsTeam(id),
    getTmsTeamMembers(id).catch(() => []),
    getTmsTeamMatchHistory(id).catch(() => []),
    getTmsTeamResultsByTournament(id).catch(() => [] as TeamLeaderboardWithTournament[]),
  ]);

  if (!team) notFound();

  const totalMatches = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.wins, 0);
  const totalKills   = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.total_kills, 0);
  const totalPoints  = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.total_points, 0);

  return (
    <div className="py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="size-20 rounded-2xl object-cover border border-border" />
        ) : (
          <div className="size-20 rounded-2xl bg-muted border border-border flex items-center justify-center">
            <Shield className="size-10 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">[{team.tag}]</span>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">{team.name}</h1>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="size-3" /> Thành lập {format(new Date(team.created_at), "dd/MM/yyyy", { locale: vi })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng điểm",     value: totalPoints,  icon: Star,       color: "text-amber-400" },
          { label: "Tổng kills",    value: totalKills,   icon: Swords,     color: "text-red-400" },
          { label: "Chiến thắng",   value: totalWins,    icon: Trophy,     color: "text-emerald-400" },
          { label: "Trận đã đấu",   value: totalMatches, icon: TrendingUp, color: "text-primary dark:text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", color)}>
              <Icon className="size-3.5" />{label}
            </div>
            <div className="text-2xl font-bold font-heading">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="size-4" /> Thành viên ({members.length})
          </h2>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có thành viên.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <div className="size-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold">
                    {(m.user?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/players/${m.user_id}`} className="font-semibold hover:text-primary transition-colors truncate block">
                      {m.user?.display_name ?? m.user?.email ?? "Ẩn danh"}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(m.joined_at), "dd/MM/yyyy", { locale: vi })}
                    </p>
                  </div>
                  {m.user_id === team.captain_id && (
                    <Crown className="size-3.5 text-amber-400 shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tournament history */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="size-4" /> Lịch sử giải đấu
          </h2>
          {(tournamentStats as TeamLeaderboardWithTournament[]).length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa tham gia giải đấu nào.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left">Giải đấu</th>
                    <th className="px-3 py-2 text-right">Trận</th>
                    <th className="px-3 py-2 text-right">Thắng</th>
                    <th className="px-3 py-2 text-right">Kills</th>
                    <th className="px-3 py-2 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {(tournamentStats as TeamLeaderboardWithTournament[]).map((s) => (
                    <tr key={s.tournament_id} className="border-t border-border/60 hover:bg-muted/10">
                      <td className="px-3 py-2">
                        {(s as { tournament?: { slug: string; name: string } }).tournament ? (
                          <Link href={`/tournaments/${(s as { tournament: { slug: string } }).tournament.slug}`}
                            className="hover:text-primary transition-colors font-semibold">
                            {(s as { tournament: { name: string } }).tournament.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{s.matches_played}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-400">{s.wins}</td>
                      <td className="px-3 py-2 text-right text-xs">{s.total_kills}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-amber-400">{s.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Match history */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Swords className="size-4" /> Lịch sử trận đấu ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có trận nào.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2 text-left">Giải đấu</th>
                  <th className="px-3 py-2 text-left">Vòng</th>
                  <th className="px-3 py-2 text-left">Trận</th>
                  <th className="px-3 py-2 text-left">Giờ</th>
                  <th className="px-3 py-2 text-left">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const isWinner = m.winner_id === id;
                  const isLoser  = m.status === "done" && m.winner_id && m.winner_id !== id;
                  const mt = m as unknown as { tournament?: { name: string; slug: string } };
                  return (
                    <tr key={m.id} className="border-t border-border/60 hover:bg-muted/10">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {mt.tournament ? (
                          <Link href={`/tournaments/${mt.tournament.slug}`} className="hover:text-primary transition-colors">
                            {mt.tournament.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{m.round}</td>
                      <td className="px-3 py-2 font-semibold">
                        <span className={m.team_a_id === id ? "text-primary dark:text-amber-400" : ""}>{m.team_a?.name ?? "?"}</span>
                        <span className="text-muted-foreground mx-1 font-normal">vs</span>
                        <span className={m.team_b_id === id ? "text-primary dark:text-amber-400" : ""}>{m.team_b?.name ?? "?"}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(m.scheduled_at)}</td>
                      <td className="px-3 py-2">
                        {m.status === "done" ? (
                          <span className={cn("text-xs font-bold", isWinner ? "text-emerald-400" : isLoser ? "text-red-400" : "text-muted-foreground")}>
                            {isWinner ? "Thắng" : isLoser ? "Thua" : "—"}
                          </span>
                        ) : (
                          <span className={cn("text-xs", MATCH_STATUS_COLOR[m.status])}>
                            {MATCH_STATUS_LABELS[m.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link to join */}
      <div className="flex gap-3">
        <Link href={`/teams/${id}/join`}
          className="text-xs rounded-lg border border-border px-4 py-2 hover:border-primary/40 transition-colors">
          Gia nhập đội →
        </Link>
      </div>
    </div>
  );
}
