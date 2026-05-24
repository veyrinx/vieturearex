"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart2, CheckCircle2, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; display_order: number };

type PollData = {
  id: string;
  question: string;
  status: string;
  ends_at: string | null;
  options: Array<Option & { votes: number; percent: number }>;
  totalVotes: number;
  myVote: string | null;
};

type Props = {
  pollId: string;
  question: string;
  options: Option[];
  endsAt?: string | null;
};

export function PollWidget({ pollId, question, options: initialOptions, endsAt }: Props) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPoll = async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}`, { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as PollData;
        setPoll(data);
        setSelected(data.myVote);
      } else if (res.status === 401) {
        // Not logged in — show options without results
        setPoll({
          id: pollId,
          question,
          status: "active",
          ends_at: endsAt ?? null,
          options: initialOptions.map((o) => ({ ...o, votes: 0, percent: 0 })),
          totalVotes: 0,
          myVote: null,
        });
      }
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchPoll(); }, [pollId]);

  const vote = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ option_id: selected }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Không thể bình chọn.");
        return;
      }
      toast.success("Đã bình chọn thành công!");
      await fetchPoll();
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasVoted = !!poll?.myVote;
  const isClosed = poll?.status === "closed" || (endsAt != null && new Date(endsAt) < new Date());

  const timeLeft = (() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Đã kết thúc";
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return "Sắp kết thúc";
  })();

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        {[1, 2, 3].map((i) => <div key={i} className="h-10 w-full rounded bg-muted" />)}
      </div>
    );
  }

  const displayOptions = poll?.options ?? initialOptions.map((o) => ({ ...o, votes: 0, percent: 0 }));

  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="size-5 shrink-0 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-base font-bold uppercase tracking-[0.08em] text-foreground">
            Bình chọn
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isClosed ? (
            <span className="flex items-center gap-1 text-rose-400"><Lock className="size-3" /> Đã đóng</span>
          ) : timeLeft ? (
            <span className="flex items-center gap-1"><Clock className="size-3" />{timeLeft}</span>
          ) : null}
          {poll && <span>{poll.totalVotes} phiếu</span>}
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground">{question}</p>

      <div className="space-y-2">
        {displayOptions.map((opt) => {
          const isMyVote = opt.id === poll?.myVote;
          const isChosen = opt.id === selected;
          const showResults = hasVoted || isClosed;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={hasVoted || isClosed || submitting}
              onClick={() => !hasVoted && !isClosed && setSelected(opt.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition-all",
                showResults
                  ? isMyVote
                    ? "border-primary/50 bg-primary/10 dark:border-amber-400/50 dark:bg-amber-400/10"
                    : "border-border bg-card"
                  : isChosen
                    ? "border-primary/50 bg-primary/10 dark:border-amber-400/50 dark:bg-amber-400/10"
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5 dark:hover:border-amber-400/30",
              )}
            >
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/8 dark:bg-amber-400/8 transition-all duration-500"
                  style={{ width: `${opt.percent}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isMyVote && <CheckCircle2 className="size-3.5 shrink-0 text-primary dark:text-amber-400" />}
                  <span className="truncate font-medium">{opt.label}</span>
                </div>
                {showResults && (
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {opt.percent}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!hasVoted && !isClosed && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Đăng nhập để bình chọn.</p>
          <Button
            size="sm"
            onClick={() => { void vote(); }}
            disabled={!selected || submitting}
            className="rounded-xl gap-1.5"
          >
            <BarChart2 className="size-3.5" />
            {submitting ? "Đang gửi..." : "Bình chọn"}
          </Button>
        </div>
      )}

      {hasVoted && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="size-3 text-primary dark:text-amber-400" />
          Bạn đã bình chọn.
        </p>
      )}
    </section>
  );
}
