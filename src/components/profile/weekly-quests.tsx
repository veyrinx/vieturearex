"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Gift, Loader2, Target } from "lucide-react";

/**
 * Nhiệm vụ tuần.
 *
 * Tiến độ do máy chủ đếm lại từ dữ liệu thật mỗi lần gọi (xem lib/server/
 * quests.ts) nên trang này không giữ bộ đếm riêng — nhận thưởng xong là tải lại
 * cả bảng thay vì tự sửa số trong state.
 */

interface Quest {
  key: string;
  title: string;
  hint: string;
  target: number;
  points: number;
  href: string;
  progress: number;
  done: boolean;
  claimed: boolean;
}

interface Board {
  loggedIn?: boolean;
  weekStart?: string;
  quests?: Quest[];
  earnedThisWeek?: number;
  claimableNow?: number;
}

function fmtWeek(weekStart?: string) {
  if (!weekStart) return "";
  const start = new Date(`${weekStart}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${f(start)} – ${f(end)}`;
}

export function WeeklyQuests() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/quests");
      setBoard((await res.json()) as Board);
    } catch {
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claim(key: string) {
    setClaiming(key);
    try {
      const res = await fetch("/api/user/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; points?: number };
      if (!res.ok) {
        toast.error(json.error ?? "Không nhận được thưởng.");
      } else {
        toast.success(`+${json.points} điểm đóng góp!`);
        await load();
      }
    } catch {
      toast.error("Lỗi mạng, thử lại sau.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải nhiệm vụ…
      </div>
    );
  }

  if (!board || board.loggedIn === false) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-8 text-center">
        <Target className="mx-auto size-10 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Đăng nhập để nhận nhiệm vụ tuần</p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const quests = board.quests ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Tuần {fmtWeek(board.weekStart)}
          </p>
          <p className="text-sm font-bold text-foreground">
            Đã nhận {board.earnedThisWeek ?? 0} điểm
          </p>
        </div>
        {(board.claimableNow ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-500">
            <Gift className="size-3.5" /> Còn {board.claimableNow} điểm chờ nhận
          </span>
        )}
      </div>

      <div className="space-y-2">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <div key={q.key} className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground">{q.hint}</p>
                </div>
                <span className="shrink-0 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-black text-primary">
                  +{q.points} điểm
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${q.done ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {q.progress}/{q.target}
                </span>

                {q.claimed ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                    <CheckCircle2 className="size-3.5" /> Đã nhận thưởng
                  </span>
                ) : q.done ? (
                  <button
                    onClick={() => void claim(q.key)}
                    disabled={claiming === q.key}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {claiming === q.key ? <Loader2 className="size-3.5 animate-spin" /> : <Gift className="size-3.5" />}
                    Nhận thưởng
                  </button>
                ) : (
                  <Link
                    href={q.href}
                    className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-bold text-foreground transition hover:border-primary/40"
                  >
                    Làm ngay
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Nhiệm vụ làm mới vào 00:00 thứ Hai (giờ Việt Nam). Tiến độ được đếm từ hoạt động thật của
        bạn — xoá bài viết thì tiến độ tụt lại tương ứng. Điểm thưởng cộng vào điểm đóng góp.
      </p>
    </div>
  );
}
