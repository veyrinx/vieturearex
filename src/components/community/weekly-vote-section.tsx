"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Trophy, Loader2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type VotePost = {
  id: string;
  title: string;
  category: string;
  display_name: string;
  vote_count: number;
  view_count: number;
  reply_count: number;
};

type WeeklyVoteData = {
  weekKey: string;
  posts: VotePost[];
  myVote: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Hướng dẫn":     "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Thảo luận":     "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Sự kiện":       "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Tin tức":       "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Clip & Video":  "bg-red-500/15 text-red-600 dark:text-red-400",
  "Tìm clan":      "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-amber-950">1</span>;
  if (rank === 2) return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-700 dark:bg-slate-600 dark:text-slate-200">2</span>;
  if (rank === 3) return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-700/70 text-xs font-black text-amber-100">3</span>;
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{rank}</span>;
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 animate-pulse">
      <div className="size-7 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-muted" />
        <div className="h-2.5 w-1/3 rounded bg-muted" />
      </div>
      <div className="h-7 w-20 rounded-lg bg-muted" />
    </div>
  );
}

export function WeeklyVoteSection() {
  const [data,    setData]    = useState<WeeklyVoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting,  setVoting]  = useState<string | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/weekly-vote", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleVote(postId: string) {
    if (voting) return;
    setVoting(postId);
    try {
      const res = await fetch("/api/weekly-vote", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: postId }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Vui lòng đăng nhập để bình chọn.");
        } else {
          toast.error(json.error ?? "Không thể ghi nhận bình chọn.");
        }
        return;
      }
      toast.success("Đã bình chọn thành công!");
      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          myVote: postId,
          posts: prev.posts.map((p) => {
            if (p.id === postId) return { ...p, vote_count: p.vote_count + 1 };
            if (p.id === prev.myVote) return { ...p, vote_count: Math.max(0, p.vote_count - 1) };
            return p;
          }).sort((a, b) => b.vote_count - a.vote_count),
        };
      });
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary dark:text-amber-400" />
          <span className="text-sm font-semibold text-muted-foreground">
            {data ? `Tuần này (${data.weekKey})` : "Tuần này"}
          </span>
        </div>
        {data?.posts?.length ? (
          <span className="text-xs text-muted-foreground">
            {data.posts.length} bài được đề cử
          </span>
        ) : null}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && (!data?.posts?.length) && (
        <div className="rounded-2xl border border-border bg-card/50 py-12 text-center">
          <Trophy className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">Chưa có bài viết nào được đề cử tuần này</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Hãy đăng bài và nhận bình chọn từ cộng đồng!</p>
        </div>
      )}

      {/* Posts */}
      {!loading && !!data?.posts?.length && (
        <div className="space-y-2">
          {data.posts.map((post, i) => {
            const isMyVote = data.myVote === post.id;
            const isVoting = voting === post.id;
            return (
              <div
                key={post.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
                  isMyVote
                    ? "border-primary/40 bg-primary/5 dark:border-amber-400/30 dark:bg-amber-400/5"
                    : "border-border hover:border-border/70 hover:bg-muted/30",
                )}
              >
                <RankBadge rank={i + 1} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {post.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", getCategoryColor(post.category))}>
                      {post.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{post.display_name}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-primary dark:text-amber-400">
                    {post.vote_count} phiếu
                  </span>
                  <button
                    onClick={() => handleVote(post.id)}
                    disabled={!!voting}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                      isMyVote
                        ? "bg-primary/15 text-primary dark:bg-amber-400/15 dark:text-amber-400"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-amber-400/10 dark:hover:text-amber-400",
                      voting && !isVoting && "opacity-50",
                    )}
                  >
                    {isVoting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : isMyVote ? (
                      <CheckCircle2 className="size-3" />
                    ) : null}
                    {isMyVote ? "Đã chọn" : "Bình chọn"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
