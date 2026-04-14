"use client";

import { useQuery } from "@tanstack/react-query";
import type { StreamItem } from "@/lib/types/content";

async function fetchStreams() {
  const res = await fetch("/api/streams", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load streams.");
  const data = (await res.json()) as { streams: StreamItem[] };
  return data.streams;
}

export function useStreamsQuery() {
  return useQuery({
    queryKey: ["streams"],
    queryFn: fetchStreams,
    refetchInterval: 30_000, // auto-refresh mỗi 30s để cập nhật trạng thái
    refetchOnWindowFocus: true,
  });
}
