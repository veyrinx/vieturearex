"use client";

import { useEffect, useState, useCallback } from "react";

const EMOJIS: Record<string, string> = {
  fire: "🔥",
  heart: "❤️",
  wow: "😮",
  haha: "😂",
  sad: "😢",
};

type Props = { newsId: string };

export function NewsReactions({ newsId }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/news/${newsId}/reactions`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { counts?: Record<string, number>; myReaction?: string | null }) => {
        setCounts(d.counts ?? {});
        setMyReaction(d.myReaction ?? null);
      })
      .catch(() => null);
  }, [newsId]);

  useEffect(() => { load(); }, [load]);

  const react = async (reaction: string) => {
    if (pending) return;
    setPending(true);

    // Optimistic update
    setCounts((prev) => {
      const next = { ...prev };
      if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] ?? 1) - 1);
      if (myReaction === reaction) {
        setMyReaction(null);
        setPending(false);
        return next;
      }
      next[reaction] = (next[reaction] ?? 0) + 1;
      setMyReaction(reaction);
      return next;
    });

    try {
      if (myReaction === reaction) {
        await fetch(`/api/news/${newsId}/reactions`, { method: "DELETE", credentials: "same-origin" });
      } else {
        await fetch(`/api/news/${newsId}/reactions`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction }),
        });
      }
    } catch { /* silent */ } finally {
      setPending(false);
    }
  };

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(EMOJIS).map(([key, emoji]) => {
        const count = counts[key] ?? 0;
        const active = myReaction === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => { void react(key); }}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all disabled:opacity-60 ${
              active
                ? "border-primary/50 bg-primary/10 text-foreground dark:border-amber-400/50 dark:bg-amber-400/10"
                : "border-border bg-card hover:border-primary/30 hover:bg-primary/5 dark:hover:border-amber-400/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
          </button>
        );
      })}
      {total > 0 && (
        <span className="text-xs text-muted-foreground">{total} lượt</span>
      )}
    </div>
  );
}
