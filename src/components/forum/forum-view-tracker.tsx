"use client";

import { useEffect } from "react";

export function ForumViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const sentKey = `forum-view:${postId}:${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(sentKey)) return;

    const t = setTimeout(() => {
      void fetch(`/api/forum/${postId}/view`, { method: "POST" })
        .then(() => sessionStorage.setItem(sentKey, "1"))
        .catch(() => null);
    }, 3_000);

    return () => clearTimeout(t);
  }, [postId]);

  return null;
}
