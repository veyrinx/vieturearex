"use client";

import { useEffect, useState, useCallback } from "react";
import { Mi } from "../_components/mi";

type PollOption = { id: string; label: string; votes: number; percent: number };

type Poll = {
  id: string;
  question: string;
  ends_at: string | null;
  myVote: string | null;
  options: PollOption[];
  totalVotes: number;
};

function timeLeft(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Đã kết thúc";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `Còn ${d} ngày`;
  if (h > 0) return `Còn ${h} giờ`;
  return `Còn ${m} phút`;
}

function PollCard({ poll: initial, initData }: { poll: Poll; initData: string }) {
  const [poll, setPoll] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = !!poll.myVote;
  const isEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const locked = hasVoted || isEnded;
  const tl = timeLeft(poll.ends_at);

  const vote = useCallback(async () => {
    if (!selected || submitting || locked || !initData) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/telegram/miniapp/polls/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({ option_id: selected }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        if (json.error === "already_voted") {
          setPoll((p) => ({ ...p, myVote: selected }));
        } else {
          setError(json.error ?? "Không thể bình chọn — thử lại sau.");
        }
        return;
      }
      // Optimistic update
      setPoll((p) => {
        const opts = p.options.map((o) => {
          const newVotes = o.id === selected ? o.votes + 1 : o.votes;
          return { ...o, votes: newVotes };
        });
        const total = opts.reduce((s, o) => s + o.votes, 0);
        return {
          ...p,
          myVote: selected,
          totalVotes: total,
          options: opts.map((o) => ({
            ...o,
            percent: total > 0 ? Math.round((o.votes / total) * 100) : 0,
          })),
        };
      });
    } finally {
      setSubmitting(false);
    }
  }, [selected, submitting, locked, initData, poll.id]);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mi name="bar_chart" size={16} color="var(--tg-theme-button-color,#f97316)" />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
            Bình chọn
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
          {tl && (
            <span className="flex items-center gap-0.5">
              <Mi name="schedule" size={9} />
              {tl}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Mi name="group" size={9} />
            {poll.totalVotes}
          </span>
        </div>
      </div>

      <p className="text-sm font-semibold leading-snug">{poll.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const isMyVote = opt.id === poll.myVote;
          const isChosen = opt.id === selected;
          const showResult = hasVoted || isEnded;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={locked || submitting}
              onClick={() => !locked && setSelected(opt.id)}
              className="relative w-full overflow-hidden rounded-xl text-left transition-opacity active:opacity-70 disabled:cursor-default"
              style={{
                backgroundColor: isMyVote
                  ? "rgba(249,115,22,0.15)"
                  : isChosen
                  ? "rgba(249,115,22,0.1)"
                  : "var(--tg-theme-bg-color,#000)",
                outline: isChosen && !locked ? "1.5px solid var(--tg-theme-button-color,#f97316)" : "none",
                padding: "10px 12px",
              }}
            >
              {/* Progress bar */}
              {showResult && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${opt.percent}%`,
                    backgroundColor: isMyVote ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
                  }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isMyVote && <Mi name="check_circle" size={13} fill={1} style={{ color: "var(--tg-theme-button-color,#f97316)", flexShrink: 0 }} />}
                  <span className="text-sm truncate">{opt.label}</span>
                </div>
                {showResult && (
                  <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                    {opt.percent}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Vote button */}
      {!locked && (
        <button
          type="button"
          onClick={() => { void vote(); }}
          disabled={!selected || submitting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: "var(--tg-theme-button-color,#f97316)",
            color: "var(--tg-theme-button-text-color,#fff)",
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Mi name="progress_activity" size={14} className="animate-spin" /> Đang gửi…
            </span>
          ) : "Bình chọn"}
        </button>
      )}

      {hasVoted && (
        <p className="text-[11px] flex items-center gap-1" style={{ color: "#10b981" }}>
          <Mi name="check_circle" size={11} fill={1} /> Đã bình chọn
        </p>
      )}
    </div>
  );
}

export function PollPageClient({ polls: initial }: { polls: Poll[] }) {
  const [polls, setPolls] = useState(initial);
  const [initData, setInitData] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tgInitData = window.Telegram?.WebApp?.initData ?? "";
    setInitData(tgInitData);

    // Re-fetch with initData to get myVote for each poll
    if (tgInitData) {
      fetch("/api/telegram/miniapp/polls", {
        headers: { "x-telegram-init-data": tgInitData },
      })
        .then((r) => r.json())
        .then((d: { polls?: Poll[] }) => { if (d.polls?.length) setPolls(d.polls); })
        .catch(() => null)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-6">
        <h1 className="font-bold text-base">Bình chọn</h1>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl p-4 space-y-3 animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}>
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-4 w-full rounded-full bg-white/10" />
            {[1, 2, 3].map((j) => <div key={j} className="h-10 rounded-xl bg-white/5" />)}
          </div>
        ))}
      </div>
    );
  }

  if (!polls.length) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-6">
        <h1 className="font-bold text-base">Bình chọn</h1>
        <p className="text-center text-sm py-10" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
          Chưa có poll nào đang mở.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <h1 className="font-bold text-base">Bình chọn</h1>
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} initData={initData} />
      ))}
    </div>
  );
}
