"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem } from "@/lib/types/content";

async function fetchNews(status: "published" | "draft" | "all") {
  const query = new URLSearchParams();
  if (status !== "published") {
    query.set("status", status);
  }
  const response = await fetch(`/api/news?${query.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load news.");
  }

  const data = (await response.json()) as { news: NewsItem[] };
  return data.news;
}

export function useNewsQuery(status: "published" | "draft" | "all" = "published") {
  return useQuery({
    queryKey: ["news", status],
    queryFn: () => fetchNews(status),
    refetchInterval: 60_000,
  });
}
