import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Zap, Download, Image as ImageIcon } from "lucide-react";
import { getTmsTournament, getTmsPlayerLeaderboard, getTmsTeamLeaderboard } from "@/lib/tms/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTmsTournament(slug).catch(() => null);
  return { title: t ? `BXH — ${t.name} | Arex` : "Bảng Xếp Hạng" };
}

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getTmsTournament(slug).catch(() => null);
  if (!tournament) notFound();

  const [playerLB, teamLB] = await Promise.all([
    getTmsPlayerLeaderboard(tournament.id).catch(() => []),
    getTmsTeamLeaderboard(tournament.id).catch(() => []),
  ]);

  const imageBase = `/api/tms/tournaments/${tournament.id}/image`;

  return (
    <div className="py-8 space-y-6">
      {/* Back */}
      <Link href={`/tournaments/${slug}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> {tournament.name}
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
              <Trophy className="size-5 text-amber-500" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">TMS</p>
              <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Bảng Xếp Hạng</h1>
              <p className="text-xs text-muted-foreground">{tournament.name}</p>
            </div>
          </div>
          {/* Image download buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { href: `${imageBase}/standings`, label: "BXH Đội",    icon: Download },
              { href: `${imageBase}/players`,   label: "Cá nhân",    icon: Download },
              { href: `${imageBase}/bracket`,   label: "Lịch đấu",   icon: ImageIcon },
            ].map(({ href, label, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" download
                className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-amber-500/40 hover:text-foreground transition-colors">
                <Icon className="size-3.5" /> {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Team BXH */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">Xếp hạng đội</h2>
        </div>
        {teamLB.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có kết quả.</p>
        ) : (
          <div className="rounded-2xl border border-border overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["#", "Đội", "Trận", "Thắng", "Thua", "Kills", "Points"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamLB.map((t, i) => (
                  <tr key={t.team_id} className={cn("border-t border-border/60", i < 3 && "bg-amber-500/5")}>
                    <td className="px-3 py-2 font-mono font-bold text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {t.logo_url
                          ? <img src={t.logo_url} className="size-6 rounded object-cover" alt={t.team_name} />
                          : <div className="size-6 rounded bg-muted flex items-center justify-center text-[9px] font-bold">{t.team_tag.slice(0, 2)}</div>
                        }
                        <span className="font-semibold">{t.team_name}</span>
                        <span className="text-[10px] text-muted-foreground">[{t.team_tag}]</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.matches_played}</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">{t.wins}</td>
                    <td className="px-3 py-2 text-red-400">{t.losses}</td>
                    <td className="px-3 py-2">{t.total_kills}</td>
                    <td className="px-3 py-2 font-bold text-amber-400">{t.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Player BXH */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
            <Zap className="size-3.5" /> Xếp hạng cá nhân
          </h2>
        </div>
        {playerLB.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có kết quả.</p>
        ) : (
          <div className="rounded-2xl border border-border overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["#", "Người chơi", "FF ID", "Đội", "Trận", "Kills", "Assists", "Deaths", "K/D", "Points"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerLB.map((p, i) => (
                  <tr key={p.user_id} className={cn("border-t border-border/60", i < 3 && "bg-amber-500/5")}>
                    <td className="px-3 py-2 font-mono font-bold text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <Link href={`/players/${p.user_id}`} className="hover:text-primary dark:hover:text-amber-400 transition-colors">
                        {p.display_name ?? "Ẩn danh"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-400/80">{p.ff_id ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">[{p.team_tag}]</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.matches_played}</td>
                    <td className="px-3 py-2 text-red-400 font-semibold">{p.total_kills}</td>
                    <td className="px-3 py-2 text-blue-400">{p.total_assists}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.total_deaths}</td>
                    <td className="px-3 py-2 font-mono">{p.kd_ratio}</td>
                    <td className="px-3 py-2 font-bold text-amber-400">{p.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
