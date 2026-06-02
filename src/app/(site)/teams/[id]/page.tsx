import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shield, Users, Trophy, Swords, Target, TrendingUp, Star, CalendarDays, Crown, ArrowLeft } from "lucide-react";
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
    getTmsTeam(id).catch(() => null),
    getTmsTeamMembers(id).catch(() => []),
    getTmsTeamMatchHistory(id).catch(() => []),
    getTmsTeamResultsByTournament(id).catch(() => [] as TeamLeaderboardWithTournament[]),
  ]);

  if (!team) notFound();

  const totalMatches = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.matches_played, 0);
  const totalWins    = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.wins, 0);
  const totalKills   = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.total_kills, 0);
  const totalPoints  = (tournamentStats as TeamLeaderboardWithTournament[]).reduce((s, r) => s + r.total_points, 0);

  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="py-8 space-y-6">
      {/* Back */}
      <Link href="/leaderboard"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Bảng xếp hạng
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-amber-500/4 dark:from-amber-400/5" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo_url} alt={team.name} className="size-24 rounded-2xl object-cover border-2 border-border shadow-lg shrink-0" />
          ) : (
            <div className="size-24 rounded-2xl bg-gradient-to-br from-primary/15 to-amber-500/10 border-2 border-border shadow-lg flex items-center justify-center shrink-0">
              <Shield className="size-10 text-primary dark:text-amber-400" />
            </div>
          )}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-primary/20 dark:border-amber-400/20">
                [{team.tag}]
              </span>
              <h1 className="font-heading text-2xl font-black uppercase tracking-[0.04em] text-foreground md:text-3xl">
                {team.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Thành lập {format(new Date(team.created_at), "dd/MM/yyyy", { locale: vi })}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {members.length} thành viên
              </span>
              {totalMatches > 0 && (
                <span className={cn("flex items-center gap-1 font-semibold", winRate >= 60 ? "text-emerald-400" : winRate >= 40 ? "text-amber-400" : "text-muted-foreground")}>
                  <Trophy className="size-3.5" />
                  {winRate}% tỉ lệ thắng
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng điểm",  value: totalPoints,  icon: Star,       color: "text-amber-400",  bg: "bg-amber-400/8" },
          { label: "Tổng kills", value: totalKills,   icon: Swords,     color: "text-red-400",    bg: "bg-red-400/8" },
          { label: "Thắng",      value: totalWins,    icon: Trophy,     color: "text-emerald-400",bg: "bg-emerald-400/8" },
          { label: "Trận đấu",   value: totalMatches, icon: TrendingUp, color: "text-blue-400",   bg: "bg-blue-400/8" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn("rounded-xl border border-border bg-card p-4 space-y-1.5", bg)}>
            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", color)}>
              <Icon className="size-3.5" />{label}
            </div>
            <div className="text-2xl font-black font-heading tabular-nums">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Users className="size-3.5" /> Thành viên ({members.length})
            </h2>
          </div>
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
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Trophy className="size-3.5" /> Lịch sử giải đấu
            </h2>
          </div>
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
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
            <Swords className="size-3.5" /> Lịch sử trận đấu ({matches.length})
          </h2>
        </div>
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
