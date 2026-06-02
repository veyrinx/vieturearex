import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Swords, Star, Target, Shield } from "lucide-react";
import { getGlobalPlayerLeaderboard, getGlobalTeamLeaderboard } from "@/lib/tms/data";
import { SectionHeading } from "@/components/common/section-heading";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";
import { PlayerLeaderboardClient, TeamLeaderboardClient } from "@/components/tms/leaderboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Bảng Xếp Hạng Toàn Cầu | Arex TMS",
  description: "Xếp hạng tuyển thủ và đội thi đấu Free Fire toàn thời gian trên hệ thống giải đấu Arex.",
  alternates: { canonical: `${siteConfig.url}/leaderboard` },
};

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

          <PlayerLeaderboardClient players={players} />
        </section>

        {/* Team leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Shield className="size-3.5" /> Top Đội Thi Đấu
            </h2>
          </div>

          <TeamLeaderboardClient teams={teams} />
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
