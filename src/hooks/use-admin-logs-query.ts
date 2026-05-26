"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminActivityLogItem } from "@/lib/types/content";

async function fetchAdminLogs(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.size > 0 ? `?${params}` : "";
  const response = await fetch(`/api/admin/logs${qs}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load admin logs.");
  const data = (await response.json()) as { logs: AdminActivityLogItem[] };
  return data.logs ?? [];
}

export function useAdminLogsQuery(from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-logs", from ?? "", to ?? ""],
    queryFn: () => fetchAdminLogs(from, to),
    refetchInterval: from || to ? false : 15_000,
  });
}
