import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Trophy, Swords, Target, TrendingUp, Users, Star, CalendarDays, ArrowLeft, Shield } from "lucide-react";
import { getRank, getSubRank, getRankProgress } from "@/lib/constants/ranks";
import { getTmsPlayerCareer, getMyTmsTeam } from "@/lib/tms/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { VerifiedBadge } from "@/components/common/user-badges";
import { CountNumber } from "@/components/common/count-number";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserRow = { id: string; display_name: string | null; avatar_url: string | null; ff_id: string | null; created_at: string; points?: number | null; role?: string | null; is_verified?: boolean | null };

async function getPlayer(userId: string): Promise<UserRow | null> {
  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return null;
  const { data } = await untypedFrom(sb, "users")
    .select("id, display_name, avatar_url, ff_id, created_at, points, role, is_verified")
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
  { key: "totalPoints",  label: "Tổng điểm",   icon: Star,       color: "text-amber-400",  bg: "bg-amber-400/10" },
  { key: "totalKills",   label: "Tổng kills",   icon: Swords,     color: "text-red-400",    bg: "bg-red-400/10" },
  { key: "totalWins",    label: "Thắng",        icon: Trophy,     color: "text-emerald-400",bg: "bg-emerald-400/10" },
  { key: "totalMatches", label: "Trận đấu",     icon: TrendingUp, color: "text-blue-400",   bg: "bg-blue-400/10" },
  { key: "kdRatio",      label: "K/D",          icon: Target,     color: "text-violet-400", bg: "bg-violet-400/10" },
  { key: "totalAssists", label: "Assists",      icon: Users,      color: "text-cyan-400",   bg: "bg-cyan-400/10" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  registering: "text-emerald-400", ongoing: "text-amber-400",
  finished: "text-muted-foreground", cancelled: "text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  registering: "Đăng ký", ongoing: "Đang diễn ra",
  finished: "Kết thúc", cancelled: "Huỷ",
};

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
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const stats = { totalPoints, totalKills, totalWins, totalMatches, kdRatio, totalAssists };
  const communityPoints = Number(user.points ?? 0);
  const rankMeta  = getRank(communityPoints);
  const subRank   = getSubRank(communityPoints);
  const rankProg  = getRankProgress(communityPoints);
  const initial   = (user.display_name ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="py-8 space-y-6 max-w-3xl mx-auto">

      {/* Back */}
      <Link href="/leaderboard"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Bảng xếp hạng
      </Link>

      {/* Profile header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5 dark:from-amber-400/6" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="relative p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.display_name ?? ""} width={96} height={96} unoptimized
                className="size-24 rounded-2xl object-cover border-2 border-border shadow-lg" />
            ) : (
              <div className="size-24 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border-2 border-border shadow-lg flex items-center justify-center text-4xl font-black text-primary dark:text-amber-400">
                {initial}
              </div>
            )}
            {totalMatches > 0 && winRate >= 60 && (
              <span className="absolute -bottom-2 -right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white shadow">
                {winRate}% WR
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h1 className="flex items-center gap-2 font-heading text-2xl font-black uppercase tracking-[0.04em] leading-tight text-foreground md:text-3xl">
                {user.display_name ?? "Chưa đặt tên"}
                <VerifiedBadge role={user.role} isVerified={user.is_verified} size="lg" className="size-6" />
              </h1>
              {user.ff_id && (
                <p className="mt-0.5 font-mono text-sm text-amber-400 font-semibold">FF ID: {user.ff_id}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {communityPoints > 0 && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold", rankMeta.bg, rankMeta.color)}>
                  <span className="text-sm">{rankMeta.icon}</span>
                  {rankMeta.rank} {subRank}
                  <span className="opacity-60 font-normal">· {communityPoints.toLocaleString("vi-VN")}đ</span>
                </span>
              )}
              {team && (
                <Link href={`/teams/${team.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary dark:border-amber-400/30 dark:bg-amber-400/5 dark:text-amber-400 hover:brightness-110 transition-all">
                  <Shield className="size-3" />
                  [{team.tag}] {team.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Tham gia {format(new Date(user.created_at), "dd/MM/yyyy", { locale: vi })}
              </span>
            </div>

            {/* Rank progress bar */}
            {communityPoints > 0 && (
              <div className="max-w-xs space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", rankMeta.color.replace("text-", "bg-"))}
                    style={{ width: `${rankProg}%` }} />
                </div>
              </div>
            )}
          </div>
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
            <span className="ml-auto text-[10px] text-muted-foreground font-semibold">{career.length} giải đấu</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {statCards.map(({ key, label, icon: Icon, color, bg }) => (
              <div key={key} className={cn("rounded-xl border border-border bg-card p-3 text-center space-y-1.5 hover:shadow-sm transition-shadow", bg)}>
                <div className={cn("flex size-7 mx-auto items-center justify-center rounded-lg bg-background/60", color)}>
                  <Icon className="size-3.5" />
                </div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
                <p className="text-base font-black tabular-nums leading-none">
                  <CountNumber value={stats[key]} decimals={key === "kdRatio" ? 2 : 0} />
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
              <Trophy className="size-3.5" /> Lịch sử giải đấu
            </h2>
            <span className="ml-auto text-[10px] text-muted-foreground font-semibold">{career.length} giải</span>
          </div>
          <div className="space-y-2">
            {career.map((row) => {
              const t = row.tournament as { id: string; name: string; slug: string; status: string } | undefined;
              const wr = row.matches_played > 0 ? Math.round((row.wins / row.matches_played) * 100) : 0;
              return (
                <div key={`${row.tournament_id}-${row.user_id}`}
                  className="group rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    {t ? (
                      <Link href={`/tournaments/${t.slug}`}
                        className="font-semibold text-sm hover:text-primary dark:hover:text-amber-400 transition-colors line-clamp-1">
                        {t.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-sm line-clamp-1">{row.team_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">[{row.team_tag}] {row.team_name}</p>
                      {t?.status && (
                        <span className={cn("text-[9px] font-bold uppercase", STATUS_COLOR[t.status] ?? "text-muted-foreground")}>
                          · {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {[
                      { label: "Điểm",  value: row.total_points.toLocaleString(), highlight: true },
                      { label: "Kills", value: row.total_kills.toLocaleString(), highlight: false },
                      { label: "Trận",  value: row.matches_played, highlight: false },
                      { label: "WR",    value: `${wr}%`, highlight: wr >= 60 },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className="text-center min-w-[40px]">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className={cn("text-sm font-bold tabular-nums", highlight ? "text-amber-400" : "text-foreground")}>{value}</p>
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
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Trophy className="size-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Chưa tham gia giải đấu nào</p>
          <Link href="/tournaments"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Xem giải đấu
          </Link>
        </div>
      )}
    </div>
  );
}
