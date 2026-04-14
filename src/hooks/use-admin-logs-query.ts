"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminActivityLogItem } from "@/lib/types/content";

async function fetchAdminLogs() {
  const response = await fetch("/api/admin/logs", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load admin logs.");
  }

  const data = (await response.json()) as { logs: AdminActivityLogItem[] };
  return data.logs;
}

export function useAdminLogsQuery() {
  return useQuery({
    queryKey: ["admin-logs"],
    queryFn: fetchAdminLogs,
    refetchInterval: 15_000,
  });
}
