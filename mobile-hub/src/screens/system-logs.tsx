import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Card, EmptyState, ErrorState, SearchInput, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { errorMessage } from "@/components/toast";
import { useLogs } from "@/lib/queries";
import { formatDateTime, timeAgo } from "@/lib/format";

export function LogsScreen() {
  const logs = useLogs();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = logs.data ?? [];
    if (!needle) return list;
    return list.filter((log) =>
      `${log.summary} ${log.action} ${log.actor_email}`.toLowerCase().includes(needle),
    );
  }, [logs.data, search]);

  return (
    <div className="space-y-4">
      <SubHeader title="Nhật ký hoạt động" description="500 thao tác gần nhất" />
      <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo người, hành động…" />

      {logs.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs.isError ? (
        <ErrorState message={errorMessage(logs.error)} onRetry={() => void logs.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title={search ? "Không tìm thấy" : "Chưa có hoạt động"}
          description={search ? "Thử từ khoá khác." : undefined}
        />
      ) : (
        <Card className="divide-y divide-ink-800 p-0">
          {filtered.map((log) => (
            <div key={log.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-[13.5px] leading-snug">{log.summary}</p>
                <span className="shrink-0 text-[11px] text-mist-500">{timeAgo(log.created_at)}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-mist-500">
                {log.actor_email} · {log.action}
              </p>
              <p className="text-[11px] text-mist-500/70">{formatDateTime(log.created_at)}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
