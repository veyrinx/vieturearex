"use client";

import { useEffect } from "react";

export function WikiViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const sentKey = `wiki-view:${slug}:${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(sentKey)) return;

    const t = setTimeout(() => {
      void fetch(`/api/wiki/${slug}/view`, { method: "POST" })
        .then(() => sessionStorage.setItem(sentKey, "1"))
        .catch(() => null);
    }, 3_000);

    return () => clearTimeout(t);
  }, [slug]);

  return null;
}
