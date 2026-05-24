import type { Metadata } from "next";
import Link from "next/link";
import { Users, Trophy, Swords, Target, TrendingUp, Star, ArrowLeft } from "lucide-react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getTmsPlayerCareer } from "@/lib/tms/data";
import { cn } from "@/lib/utils";
import { PlayerSearchForm } from "@/components/tms/player-search-form";

type PlayerStats = {
  totalPoints: number; totalKills: number; totalAssists: number;
  totalDeaths: number; totalMatches: number; totalWins: number;
  kdRatio: number; winRate: number;
};

export const metadata: Metadata = { title: "So Sánh Tuyển Thủ | Arex TMS" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserRow = { id: string; display_name: string | null; avatar_url: string | null; ff_id: string | null };

async function getPlayerData(userId: string) {
  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return null;

  const { data: user } = await untypedFrom(sb, "users")
    .select("id, display_name, avatar_url, ff_id")
    .eq("id", userId)
    .single() as { data: UserRow | null };

  if (!user) return null;

  const career = await getTmsPlayerCareer(userId).catch(() => []);
  const totalMatches = career.reduce((s, r) => s + r.matches_played, 0);
  const totalKills   = career.reduce((s, r) => s + r.total_kills, 0);
  const totalAssists = career.reduce((s, r) => s + r.total_assists, 0);
  const totalDeaths  = career.reduce((s, r) => s + r.total_deaths, 0);
  const totalPoints  = career.reduce((s, r) => s + r.total_points, 0);
  const totalWins    = career.reduce((s, r) => s + r.wins, 0);
  const kdRatio      = totalDeaths > 0 ? +(totalKills / totalDeaths).toFixed(2) : totalKills;
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return { user, stats: { totalPoints, totalKills, totalAssists, totalDeaths, totalMatches, totalWins, kdRatio, winRate } };
}

const STAT_ROWS: Array<{ key: keyof PlayerStats; label: string; icon: React.ElementType; color: string; unit?: string }> = [
  { key: "totalPoints",  label: "Tổng điểm",    icon: Star,       color: "text-amber-400" },
  { key: "totalKills",   label: "Tổng kills",    icon: Swords,     color: "text-red-400" },
  { key: "totalWins",    label: "Chiến thắng",   icon: Trophy,     color: "text-emerald-400" },
  { key: "totalMatches", label: "Trận đã đấu",   icon: TrendingUp, color: "text-primary dark:text-amber-400" },
  { key: "kdRatio",      label: "K/D ratio",     icon: Target,     color: "text-violet-400" },
  { key: "totalAssists", label: "Tổng assists",  icon: Users,      color: "text-blue-400" },
  { key: "winRate",      label: "Tỉ lệ thắng",  icon: Trophy,     color: "text-emerald-400", unit: "%" },
] as const;

function PlayerAvatar({ user }: { user: UserRow }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name ?? ""}
        className="mx-auto size-16 rounded-2xl object-cover border border-border"
      />
    );
  }
  return (
    <div className="mx-auto size-16 rounded-2xl bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center text-2xl font-black text-primary dark:text-amber-400">
      {(user.display_name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function WinnerBadge({ isWinner }: { isWinner: boolean }) {
  if (!isWinner) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
      <Star className="size-2.5" /> WIN
    </span>
  );
}

export default async function PlayerComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  const [playerA, playerB] = await Promise.all([
    a ? getPlayerData(a).catch(() => null) : Promise.resolve(null),
    b ? getPlayerData(b).catch(() => null) : Promise.resolve(null),
  ]);

  const hasBoth = !!playerA && !!playerB;

  return (
    <div className="py-10 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Giải đấu
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
          So Sánh Tuyển Thủ
        </h1>
        <p className="text-sm text-muted-foreground">Tìm 2 tuyển thủ để so sánh thống kê.</p>
      </div>

      {/* Search form */}
      <PlayerSearchForm currentA={a} currentB={b} />

      {/* Comparison */}
      {hasBoth && (
        <div className="space-y-6">
          {/* Player headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Player A */}
            <div className="text-center space-y-2">
              <PlayerAvatar user={playerA.user} />
              <Link
                href={`/players/${playerA.user.id}`}
                className="block font-heading text-base font-bold uppercase tracking-[0.06em] hover:text-primary dark:hover:text-amber-400 transition-colors"
              >
                {playerA.user.display_name ?? "—"}
              </Link>
              {playerA.user.ff_id && (
                <p className="text-xs font-mono text-amber-400">FF: {playerA.user.ff_id}</p>
              )}
            </div>

            <div className="text-center">
              <span className="font-heading text-lg font-black text-muted-foreground/50 uppercase tracking-widest">VS</span>
            </div>

            {/* Player B */}
            <div className="text-center space-y-2">
              <PlayerAvatar user={playerB.user} />
              <Link
                href={`/players/${playerB.user.id}`}
                className="block font-heading text-base font-bold uppercase tracking-[0.06em] hover:text-primary dark:hover:text-amber-400 transition-colors"
              >
                {playerB.user.display_name ?? "—"}
              </Link>
              {playerB.user.ff_id && (
                <p className="text-xs font-mono text-amber-400">FF: {playerB.user.ff_id}</p>
              )}
            </div>
          </div>

          {/* Stats comparison table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {STAT_ROWS.map(({ key, label, icon: Icon, color, unit }, idx) => {
              const valA = playerA.stats[key];
              const valB = playerB.stats[key];
              const numA = typeof valA === "number" ? valA : 0;
              const numB = typeof valB === "number" ? valB : 0;
              const aWins = numA > numB;
              const bWins = numB > numA;

              return (
                <div
                  key={key}
                  className={cn(
                    "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3",
                    idx % 2 === 0 ? "bg-muted/30" : "",
                  )}
                >
                  <div className={cn("text-right font-bold tabular-nums text-sm", aWins ? "text-foreground" : "text-muted-foreground")}>
                    {numA.toLocaleString("vi-VN")}{unit}
                    <WinnerBadge isWinner={aWins} />
                  </div>

                  <div className="flex items-center gap-1.5 justify-center min-w-[120px]">
                    <Icon className={cn("size-3.5", color)} />
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{label}</span>
                  </div>

                  <div className={cn("text-left font-bold tabular-nums text-sm", bWins ? "text-foreground" : "text-muted-foreground")}>
                    <WinnerBadge isWinner={bWins} />
                    {numB.toLocaleString("vi-VN")}{unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasBoth && (a || b) && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Users className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chọn đủ 2 tuyển thủ để so sánh.</p>
        </div>
      )}
    </div>
  );
}
