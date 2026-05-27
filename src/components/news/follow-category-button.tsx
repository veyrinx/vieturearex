"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Props = { category: string };

export function FollowCategoryButton({ category }: Props) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/user/follows", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { follows?: string[] }) => {
        setFollowing((d.follows ?? []).includes(category));
      })
      .catch(() => setFollowing(false));
  }, [category]);

  const toggle = async () => {
    if (pending || following === null) return;
    setPending(true);
    const method = following ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/user/follows", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) setFollowing(!following);
    } catch { /* silent */ } finally {
      setPending(false);
    }
  };

  if (following === null) return null;

  return (
    <button
      type="button"
      onClick={() => { void toggle(); }}
      disabled={pending}
      title={following ? `Bỏ theo dõi ${category}` : `Theo dõi ${category}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${
        following
          ? "border-primary/50 bg-primary/10 text-primary dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-400"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {following ? <Bell size={12} /> : <BellOff size={12} />}
      {following ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}
