"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewsItem } from "@/lib/types/content";

export const ADMIN_NEWS_KEY = ["admin-news"] as const;

async function fetchAdminNews(): Promise<NewsItem[]> {
  const res = await fetch("/api/admin/news", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load admin news.");
  const data = (await res.json()) as { news: NewsItem[] };
  return data.news;
}

export function useAdminNewsQuery() {
  return useQuery({
    queryKey: ADMIN_NEWS_KEY,
    queryFn: fetchAdminNews,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 20_000,
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateAdminNews() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_NEWS_KEY });
}
