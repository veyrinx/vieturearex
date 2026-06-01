import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Swords, Star, Target, TrendingUp, Shield } from "lucide-react";
import { getGlobalPlayerLeaderboard, getGlobalTeamLeaderboard } from "@/lib/tms/data";
import { SectionHeading } from "@/components/common/section-heading";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Bảng Xếp Hạng Toàn Cầu | Arex TMS",
  description: "Xếp hạng tuyển thủ và đội thi đấu Free Fire toàn thời gian trên hệ thống giải đấu Arex.",
  alternates: { canonical: `${siteConfig.url}/leaderboard` },
};

const medals = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-base leading-none">{medals[rank - 1]}</span>;
  return <span className="w-6 text-center text-xs font-mono font-bold text-muted-foreground">{rank}</span>;
}

export default async function LeaderboardPage() {
  const [players, teams] = await Promise.all([
    getGlobalPlayerLeaderboard(50).catch(() => []),
    getGlobalTeamLeaderboard(50).catch(() => []),
  ]);

  return (
    <div className="py-10 space-y-10">
      <SectionHeading
        eyebrow="TMS"
        title="BẢNG XẾP HẠNG"
        description="Thống kê tổng hợp từ tất cả giải đấu"
      />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Player leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Swords className="size-3.5" /> Top Tuyển Thủ
            </h2>
          </div>

          {players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              Chưa có dữ liệu.
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Tuyển thủ</th>
                    <th className="px-3 py-2 text-right">Điểm</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">Kills</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">K/D</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Thắng%</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Trận</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => {
                    const rank = i + 1;
                    const winRate = p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;
                    return (
                      <tr key={p.user_id}
                        className={cn(
                          "border-t border-border/60 hover:bg-muted/10 transition-colors",
                          rank === 1 && "bg-amber-500/5",
                          rank === 2 && "bg-zinc-500/5",
                          rank === 3 && "bg-orange-500/5",
                        )}>
                        <td className="px-3 py-2.5">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/players/${p.user_id}`} className="font-semibold hover:text-primary dark:hover:text-amber-400 transition-colors block truncate max-w-[130px]">
                            {p.display_name ?? "—"}
                          </Link>
                          {p.ff_id && (
                            <p className="text-[10px] text-muted-foreground font-mono">{p.ff_id}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-400 tabular-nums">{p.total_points.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums hidden sm:table-cell">{p.total_kills.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 text-right text-xs font-mono hidden sm:table-cell",
                          p.kd_ratio >= 3 ? "text-emerald-400" : p.kd_ratio >= 1.5 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {p.kd_ratio}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right text-xs font-semibold tabular-nums hidden md:table-cell",
                          winRate >= 60 ? "text-emerald-400" : winRate >= 40 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {winRate}%
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums hidden md:table-cell">{p.matches_played}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Team leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Shield className="size-3.5" /> Top Đội Thi Đấu
            </h2>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              Chưa có dữ liệu.
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Đội</th>
                    <th className="px-3 py-2 text-right">Điểm</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">Kills</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">Thắng</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Giải</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => {
                    const rank = i + 1;
                    const winRate = t.matches_played > 0 ? Math.round((t.wins / t.matches_played) * 100) : 0;
                    return (
                      <tr key={t.team_id}
                        className={cn(
                          "border-t border-border/60 hover:bg-muted/10 transition-colors",
                          rank === 1 && "bg-amber-500/5",
                          rank === 2 && "bg-zinc-500/5",
                          rank === 3 && "bg-orange-500/5",
                        )}>
                        <td className="px-3 py-2.5">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {t.logo_url
                              ? <Image src={t.logo_url} alt={t.team_name} width={24} height={24} unoptimized className="size-6 rounded object-cover shrink-0" />
                              : <div className="size-6 rounded bg-muted flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0">{t.team_tag.slice(0, 2)}</div>
                            }
                            <div className="min-w-0">
                              <Link href={`/teams/${t.team_id}`} className="font-semibold hover:text-primary dark:hover:text-amber-400 transition-colors block truncate max-w-[110px]">
                                {t.team_name}
                              </Link>
                              <p className="text-[9px] text-muted-foreground font-mono">[{t.team_tag}]</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-400 tabular-nums">{t.total_points.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums hidden sm:table-cell">{t.total_kills.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 text-right text-xs font-semibold hidden sm:table-cell",
                          winRate >= 60 ? "text-emerald-400" : winRate >= 40 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {winRate}%
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums hidden md:table-cell">{t.tournaments_played}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tuyển thủ",   value: players.length, icon: Swords,     color: "text-red-400" },
          { label: "Đội thi đấu", value: teams.length,   icon: Shield,     color: "text-primary dark:text-amber-400" },
          { label: "Tổng kills",  value: players.reduce((s, p) => s + p.total_kills, 0).toLocaleString(), icon: Target, color: "text-amber-400" },
          { label: "Top điểm",    value: players[0]?.total_points.toLocaleString() ?? "—", icon: Star, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", color)}>
              <Icon className="size-3.5" />{label}
            </div>
            <div className="text-2xl font-bold font-heading">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/tournaments" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Xem giải đấu →
        </Link>
      </div>
    </div>
  );
}
