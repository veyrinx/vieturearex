"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActivityLogType } from "@/lib/constants/activity-log-types";
import type { AdminActivityLogItem } from "@/lib/types/content";

export type AdminLogsResult = {
  logs: AdminActivityLogItem[];
  /** Tổng từng loại trên toàn khoảng thời gian; null khi chạy chế độ demo. */
  counts: { all: number; admin: number; user: number; visitor: number } | null;
  /** Trần số dòng máy chủ trả về — để báo cho người xem biết đang bị cắt. */
  limit: number | null;
};

async function fetchAdminLogs(from?: string, to?: string, type?: ActivityLogType) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (type && type !== "all") params.set("type", type);
  const qs = params.size > 0 ? `?${params}` : "";
  const response = await fetch(`/api/admin/logs${qs}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load admin logs.");
  const data = (await response.json()) as Partial<AdminLogsResult>;
  return {
    logs: data.logs ?? [],
    counts: data.counts ?? null,
    limit: data.limit ?? null,
  } satisfies AdminLogsResult;
}

export function useAdminLogsQuery(from?: string, to?: string, type: ActivityLogType = "all") {
  return useQuery({
    queryKey: ["admin-logs", from ?? "", to ?? "", type],
    queryFn: () => fetchAdminLogs(from, to, type),
    // Giữ kết quả cũ khi đổi tab để bảng không nháy trắng giữa hai lần tải.
    placeholderData: (previous) => previous,
    refetchInterval: from || to ? false : 15_000,
  });
}
