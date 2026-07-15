"use client";

import { Crown, Shield, Star, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_LEADERBOARD = [
  { name: "Vieture", points: 12580, rank: 1 },
  { name: "Arex", points: 9870, rank: 2 },
  { name: "Shadow", points: 7650, rank: 3 },
];

const MOCK_ACTIVITIES = [
  { type: "achievement", text: "Vieture vừa đạt huy hiệu 'Huyền Thoại'", icon: Trophy },
  { type: "challenge", text: "Thử thách tuần: 100 kills với M1887", icon: Swords },
  { type: "poll", text: "Bình chọn: Nhân vật nào cần buff nhất?", icon: Star },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-4 text-amber-400" />;
  if (rank === 2) return <Trophy className="size-4 text-slate-400" />;
  if (rank === 3) return <Trophy className="size-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs font-mono text-muted-foreground">#{rank}</span>;
}

/**
 * Module hiển thị các hoạt động cộng đồng nổi bật:
 * - Top 3 bảng xếp hạng tuần/mùa.
 * - Thành tích mới nhất của người dùng.
 * - Thử thách hoặc bình chọn đang diễn ra.
 * Dữ liệu cần được lấy từ API. Đây là phiên bản UI với dữ liệu giả lập.
 */
export function CommunityHighlights() {
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Top 3 Bảng Xếp Hạng Tuần
        </p>
        {MOCK_LEADERBOARD.map((user) => (
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
        ))}
      </div>

      {/* Other activities */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {MOCK_ACTIVITIES.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <a
              key={index}
              href="#"
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  activity.type === "achievement" && "bg-amber-500/10 text-amber-500",
                  activity.type === "challenge" && "bg-red-500/10 text-red-500",
                  activity.type === "poll" && "bg-blue-500/10 text-blue-500",
                )}
              >
                <Icon className="size-4" />
              </div>
              <p className="flex-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {activity.text}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}