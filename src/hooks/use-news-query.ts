"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem } from "@/lib/types/content";

async function fetchNews(status: "published" | "draft" | "all") {
  const query = new URLSearchParams();
  if (status !== "published") {
    query.set("status", status);
  }
  // List views only render cards — skip the heavy article body in the refetch.
  query.set("content", "0");
  const response = await fetch(`/api/news?${query.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load news.");
  }

  const data = (await response.json()) as { news: NewsItem[] };
  return data.news ?? [];
}

export function useNewsQuery(status: "published" | "draft" | "all" = "published") {
  return useQuery({
    queryKey: ["news", status],
    queryFn: () => fetchNews(status),
    staleTime: 2 * 60 * 60 * 1000,    // 2 hours — don't refetch unless stale
    refetchInterval: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
