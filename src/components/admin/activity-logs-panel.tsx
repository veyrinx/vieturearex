"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";
import { ShieldCheck, Download, Search, RefreshCw, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAdminLogsQuery } from "@/hooks/use-admin-logs-query";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminActivityLogItem } from "@/lib/types/content";

const USER_ACTIONS = new Set(["USER_REGISTERED", "USER_COMMENTED"]);
type TypeFilter = "all" | "admin" | "user";

function exportLogsCSV(logs: AdminActivityLogItem[]) {
  const headers = ["Thời gian", "Tài khoản", "Hành động", "Đối tượng", "ID đối tượng", "Chi tiết"];
  const rows = logs.map((item) => [
    new Date(item.created_at).toLocaleString("vi-VN"),
    item.actor_email,
    item.action,
    item.target_type,
    item.target_id ?? "",
    item.summary,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Đã xuất ${logs.length} bản ghi nhật ký.`);
}

const ACTION_COLORS: Record<string, string> = {
  NEWS_CREATED: "bg-green-500/10 text-green-500 border-green-500/20",
  NEWS_UPDATED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  NEWS_DELETED: "bg-red-500/10 text-red-500 border-red-500/20",
  USER_ROLE_UPDATED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  USER_DELETED: "bg-red-500/10 text-red-500 border-red-500/20",
  USER_REGISTERED: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  USER_COMMENTED: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  SETTINGS_UPDATED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  EVENT_CREATED: "bg-green-500/10 text-green-500 border-green-500/20",
  EVENT_UPDATED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  EVENT_DELETED: "bg-red-500/10 text-red-500 border-red-500/20",
  COMMENT_APPROVED: "bg-green-500/10 text-green-500 border-green-500/20",
  COMMENT_REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function ActivityLogsPanel() {
  const { data: logs = [], isLoading, refetch } = useAdminLogsQuery();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const typeFiltered = typeFilter === "admin"
    ? logs.filter((l) => !USER_ACTIONS.has(l.action))
    : typeFilter === "user"
      ? logs.filter((l) => USER_ACTIONS.has(l.action))
      : logs;

  const filtered = search
    ? typeFiltered.filter((l) =>
        l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.summary.toLowerCase().includes(search.toLowerCase())
      )
    : typeFiltered;

  const adminCount = logs.filter((l) => !USER_ACTIONS.has(l.action)).length;
  const userCount = logs.filter((l) => USER_ACTIONS.has(l.action)).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
            NHẬT KÝ HOẠT ĐỘNG 48H
          </h1>
          <p className="text-sm text-muted-foreground">
            LƯU CÁC HOẠT ĐỘNG CHÍNH CỦA TRANG ADMIN TRONG 48 GIỜ GẦN NHẤT, SAU ĐÓ TỰ ĐỘNG XÓA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-xl text-sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-xl text-sm"
            onClick={() => exportLogsCSV(filtered)}
            disabled={logs.length === 0}
          >
            <Download className="size-3.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Type filter + Search */}
      {logs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all",   label: "Tất cả",      count: logs.length,  icon: ShieldCheck },
              { id: "admin", label: "Quản trị",    count: adminCount,   icon: Shield },
              { id: "user",  label: "Người dùng",  count: userCount,    icon: Users },
            ] as const
          ).map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTypeFilter(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                typeFilter === id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3" />
              {label}
              <span className="ml-0.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
            </button>
          ))}
          <div className="relative ml-auto max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email, hành động..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI NHẬT KÝ HỆ THỐNG..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "KHÔNG TÌM THẤY KẾT QUẢ" : "CHƯA CÓ BẢN GHI NHẬT KÝ"}
          description={search ? "Thử tìm kiếm với từ khoá khác." : "CÁC HOẠT ĐỘNG QUẢN TRỊ MỚI SẼ XUẤT HIỆN Ở ĐÂY TRONG VÒNG 48 GIỜ."}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length}/{logs.length} bản ghi</p>
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 uppercase tracking-[0.08em]">THỜI GIAN</th>
                    <th className="px-4 py-3 uppercase tracking-[0.08em]">TÀI KHOẢN</th>
                    <th className="px-4 py-3 uppercase tracking-[0.08em]">HÀNH ĐỘNG</th>
                    <th className="px-4 py-3 uppercase tracking-[0.08em]">CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const badgeColor = ACTION_COLORS[item.action] ?? "bg-primary/10 text-primary border-primary/20 dark:text-amber-300";
                    return (
                      <tr key={item.id} className="border-t border-border text-foreground align-top hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-1">
                            <p>{new Date(item.created_at).toLocaleString("vi-VN")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNowStrict(new Date(item.created_at), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">{item.actor_email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${badgeColor}`}>
                            <ShieldCheck className="size-3" />
                            {item.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p>{item.summary}</p>
                            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                              {item.target_type}
                              {item.target_id ? ` / ${item.target_id.slice(0, 8)}...` : ""}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
