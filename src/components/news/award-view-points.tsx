"use client";

import { useEffect } from "react";

export function AwardViewPoints({ newsId }: { newsId: string }) {
  useEffect(() => {
    const sentKey = `awarded:${newsId}:${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(sentKey)) return;

    const t = setTimeout(() => {
      // Track view count + award points (fire both in parallel)
      void fetch(`/api/news/${newsId}/view`, { method: "POST" }).catch(() => null);
      fetch("/api/user/award-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ newsId }),
      })
        .then(() => sessionStorage.setItem(sentKey, "1"))
        .catch(() => null);
    }, 5_000);

    return () => clearTimeout(t);
  }, [newsId]);

  return null;
}
