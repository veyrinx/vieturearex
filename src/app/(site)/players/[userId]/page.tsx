import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Trophy, Swords, Target, TrendingUp, Users, Star, CalendarDays } from "lucide-react";
import { getRank, getSubRank } from "@/lib/constants/ranks";
import { getTmsPlayerCareer, getMyTmsTeam } from "@/lib/tms/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserRow = { id: string; display_name: string | null; avatar_url: string | null; ff_id: string | null; created_at: string; points?: number | null };

async function getPlayer(userId: string): Promise<UserRow | null> {
  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return null;
  const { data } = await untypedFrom(sb, "users")
    .select("id, display_name, avatar_url, ff_id, created_at, points")
    .eq("id", userId)
    .single() as { data: UserRow | null };
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = await getPlayer(userId).catch(() => null);
  const name = user?.display_name ?? "Tuyển thủ";
  return { title: `${name} — Hồ sơ tuyển thủ | Arex TMS` };
}

const statCards = [
  { key: "totalPoints",  label: "Tổng điểm",    icon: Star,       color: "text-amber-400" },
  { key: "totalKills",   label: "Tổng kills",    icon: Swords,     color: "text-red-400" },
  { key: "totalWins",    label: "Chiến thắng",   icon: Trophy,     color: "text-emerald-400" },
  { key: "totalMatches", label: "Trận đã đấu",   icon: TrendingUp, color: "text-primary dark:text-amber-400" },
  { key: "kdRatio",      label: "K/D ratio",     icon: Target,     color: "text-violet-400" },
  { key: "totalAssists", label: "Tổng assists",  icon: Users,      color: "text-blue-400" },
] as const;

export default async function PlayerProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const [user, career, team] = await Promise.all([
    getPlayer(userId),
    getTmsPlayerCareer(userId).catch(() => []),
    getMyTmsTeam(userId).catch(() => null),
  ]);

  if (!user) notFound();

  const totalMatches = career.reduce((s, r) => s + r.matches_played, 0);
  const totalKills   = career.reduce((s, r) => s + r.total_kills, 0);
  const totalAssists = career.reduce((s, r) => s + r.total_assists, 0);
  const totalDeaths  = career.reduce((s, r) => s + r.total_deaths, 0);
  const totalPoints  = career.reduce((s, r) => s + r.total_points, 0);
  const totalWins    = career.reduce((s, r) => s + r.wins, 0);
  const kdRatio      = totalDeaths > 0 ? +(totalKills / totalDeaths).toFixed(2) : totalKills;

  const stats = { totalPoints, totalKills, totalWins, totalMatches, kdRatio, totalAssists };
  const communityPoints = Number(user.points ?? 0);
  const rankMeta = getRank(communityPoints);
  const subRank = getSubRank(communityPoints);

  return (
    <div className="py-10 space-y-8 max-w-3xl mx-auto">

      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {user.avatar_url
          ? <Image src={user.avatar_url} alt={user.display_name ?? ""} width={80} height={80} unoptimized className="size-20 rounded-2xl object-cover border border-border shrink-0" />
          : <div className="size-20 rounded-2xl bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center text-3xl font-black text-primary dark:text-amber-400 shrink-0">
              {(user.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em] leading-tight">
            {user.display_name ?? "Chưa đặt tên"}
          </h1>
          {user.ff_id && (
            <p className="text-sm font-mono text-amber-400">FF ID: {user.ff_id}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Tham gia {format(new Date(user.created_at), "dd/MM/yyyy", { locale: vi })}
          </p>
          {communityPoints > 0 && (
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold", rankMeta.bg, rankMeta.color)}>
              <span>{rankMeta.icon}</span>
              {rankMeta.rank} {subRank}
              <span className="font-normal opacity-60">· {communityPoints.toLocaleString("vi-VN")}đ</span>
            </span>
          )}
          {team && (
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="size-3.5 text-primary dark:text-amber-400" />
              <Link href={`/teams/${team.id}/join`} className="hover:underline text-primary dark:text-amber-400">
                [{team.tag}] {team.name}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Career stats */}
      {totalMatches > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
              Thống kê sự nghiệp
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
                <Icon className={cn("size-4 mx-auto", color)} />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-xl font-black tabular-nums">
                  {typeof stats[key] === "number" ? stats[key].toLocaleString("vi-VN") : stats[key]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tournament history */}
      {career.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
              <Trophy className="size-4" /> Lịch sử giải đấu ({career.length})
            </h2>
          </div>
          <div className="space-y-2">
            {career.map((row) => {
              const t = row.tournament as { id: string; name: string; slug: string; status: string } | undefined;
              const winRate = row.matches_played > 0 ? Math.round((row.wins / row.matches_played) * 100) : 0;
              return (
                <div key={`${row.tournament_id}-${row.user_id}`}
                  className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {t ? (
                      <Link href={`/tournaments/${t.slug}`} className="font-semibold text-sm hover:text-primary dark:hover:text-amber-400 transition-colors">
                        {t.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-sm">{row.team_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">[{row.team_tag}] {row.team_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-center shrink-0">
                    {[
                      { label: "Điểm", value: row.total_points },
                      { label: "Kills", value: row.total_kills },
                      { label: "Trận", value: row.matches_played },
                      { label: "Thắng", value: `${winRate}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="min-w-[44px]">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {career.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Trophy className="size-8 mx-auto mb-3 opacity-30" />
          <p>Chưa tham gia giải đấu nào.</p>
          <Link href="/tournaments" className="mt-3 inline-block text-xs text-primary dark:text-amber-400 hover:underline">
            Xem các giải đấu →
          </Link>
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/tournaments" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Quay lại giải đấu
        </Link>
      </div>
    </div>
  );
}
