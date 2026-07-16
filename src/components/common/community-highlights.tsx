import Link from "next/link";
import { Crown, Trophy, Star, Newspaper, CalendarDays, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGlobalPlayerLeaderboard } from "@/lib/tms/data";
import { getNews, getEvents } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-4 text-amber-400" />;
  if (rank === 2) return <Trophy className="size-4 text-slate-400" />;
  if (rank === 3) return <Trophy className="size-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs font-mono text-muted-foreground">#{rank}</span>;
}

async function getLatestPoll() {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  try {
    const { data } = (await untypedFrom(db, "polls")
      .select("id, question, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { id: string; question: string } | null };
    return data;
  } catch {
    return null;
  }
}

type Activity = { text: string; icon: LucideIcon; tone: "amber" | "red" | "blue"; href: string };

/**
 * Tâm điểm cộng đồng — dữ liệu THẬT:
 * - Top 3 tuyển thủ tổng hợp từ các giải đấu.
 * - Poll đang mở + tin tức + sự kiện mới nhất.
 */
export async function CommunityHighlights() {
  const [players, poll, news, events] = await Promise.all([
    getGlobalPlayerLeaderboard(3).catch(() => []),
    getLatestPoll(),
    getNews("published").catch(() => []),
    getEvents().catch(() => []),
  ]);

  const top = players.slice(0, 3).map((p, i) => ({
    name: p.display_name || p.team_name || "Ẩn danh",
    points: p.total_points,
    rank: i + 1,
  }));

  const latestNews = news[0];
  const latestEvent = events.find((e) => e.status === "active" || e.status === "upcoming") ?? events[0];

  const activities: Activity[] = [];
  if (poll) activities.push({ text: `Bình chọn: ${poll.question}`, icon: Star, tone: "blue", href: "/cong-dong" });
  if (latestNews) activities.push({ text: latestNews.title, icon: Newspaper, tone: "amber", href: `/tin-tuc/${latestNews.slug}` });
  if (latestEvent) activities.push({ text: latestEvent.title, icon: CalendarDays, tone: "red", href: `/su-kien/${latestEvent.id}` });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
            Tâm Điểm Cộng Đồng
          </h3>
          <p className="text-xs text-muted-foreground">Bảng xếp hạng và hoạt động nổi bật</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Crown className="size-5" />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Top 3 Tuyển Thủ
          </p>
          <Link href="/tournaments" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
            Xem tất cả
          </Link>
        </div>
        {top.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-6 text-center">
            <p className="text-xs text-muted-foreground">Chưa có dữ liệu xếp hạng giải đấu.</p>
          </div>
        ) : (
          top.map((user) => (
            <div
              key={user.rank}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5 transition-all",
                user.rank === 1 && "border-amber-400/30 bg-amber-400/5",
                user.rank === 2 && "border-slate-400/20 bg-slate-400/5",
                user.rank === 3 && "border-amber-700/20 bg-amber-700/5",
              )}
            >
              <div className="flex size-7 shrink-0 items-center justify-center">
                <RankIcon rank={user.rank} />
              </div>
              <p className="min-w-0 flex-1 truncate font-semibold text-foreground">{user.name}</p>
              <p className="shrink-0 text-xs font-bold text-primary tabular-nums">
                {user.points.toLocaleString("vi-VN")} pts
              </p>
            </div>
          ))
        )}
      </div>

      {/* Real activities */}
      {activities.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <Link
                key={index}
                href={activity.href}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    activity.tone === "amber" && "bg-amber-500/10 text-amber-500",
                    activity.tone === "red" && "bg-red-500/10 text-red-500",
                    activity.tone === "blue" && "bg-blue-500/10 text-blue-500",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <p className="flex-1 truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {activity.text}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
