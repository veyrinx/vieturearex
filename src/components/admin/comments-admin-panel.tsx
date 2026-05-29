"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Trash2, RefreshCw, MessageSquare, Clock, Search, CheckCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  news_id?: string;
  event_id?: string;
  user_id: string | null;
  display_name: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type StatusFilter = "pending" | "approved" | "rejected" | "all";
type CommentSource = "news_comments" | "event_comments";

const STATUS_META: Record<StatusFilter, { label: string; color: string; bg: string }> = {
  pending:  { label: "Chờ duyệt",  color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/30" },
  approved: { label: "Đã duyệt",   color: "text-green-500",  bg: "bg-green-500/10 border-green-500/30" },
  rejected: { label: "Từ chối",    color: "text-rose-500",   bg: "bg-rose-500/10 border-rose-500/30" },
  all:      { label: "Tất cả",     color: "text-foreground", bg: "bg-muted border-border" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];
function getColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

async function fetchComments(status: StatusFilter, source: CommentSource): Promise<Comment[]> {
  const res = await fetch(`/api/admin/comments?status=${status}&table=${source}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json() as { comments: Comment[] };
  return data.comments ?? [];
}

export function CommentsAdminPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [source, setSource] = useState<CommentSource>("news_comments");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: comments = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["admin-comments", statusFilter, source],
    queryFn: () => fetchComments(statusFilter, source),
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setLoadingId(id);
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, table: source }),
    });
    setLoadingId(null);
    if (!res.ok) { toast.error("Không thể cập nhật."); return; }
    toast.success(status === "approved" ? "Đã duyệt bình luận." : "Đã từ chối bình luận.");
    void queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
  };

  const bulkUpdateStatus = async (status: "approved" | "rejected") => {
    const ids = filtered.map((c) => c.id);
    if (!ids.length) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status, table: source }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Không thể thực hiện."); return; }
    const data = await res.json() as { updated?: number };
    toast.success(`Đã ${status === "approved" ? "duyệt" : "từ chối"} ${data.updated ?? ids.length} bình luận.`);
    void queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
  };

  const onDelete = async (id: string) => {
    const res = await fetch("/api/admin/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, table: source }),
    });
    if (!res.ok) { toast.error("Không thể xóa."); return; }
    toast.success("Đã xóa bình luận.");
    void queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
  };

  const filtered = comments.filter((c) =>
    !search || c.display_name.toLowerCase().includes(search.toLowerCase()) || c.content.toLowerCase().includes(search.toLowerCase()),
  );

  const pendingCount = comments.filter((c) => c.status === "pending").length;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--";

  return (
    <div className="space-y-4">
      {/* Source tabs */}
      <div className="flex items-center gap-2">
        {(["news_comments", "event_comments"] as CommentSource[]).map((s) => (
          <button
            key={s}
            onClick={() => { setSource(s); setStatusFilter("pending"); }}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              source === s ? "border-primary/30 bg-primary/10 text-primary dark:text-amber-300" : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {s === "news_comments" ? "Tin tức" : "Sự kiện"}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((s) => {
          const m = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                statusFilter === s ? cn(m.bg, m.color) : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "pending" && pendingCount > 0 && statusFilter !== "pending" && (
                <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
              {m.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bình luận..."
              className="h-8 w-48 pl-7 text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-comments"] })}
            disabled={isFetching}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
          >
            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
            {lastUpdated}
          </Button>
        </div>
      </div>

      {/* Stats + bulk actions */}
      {statusFilter === "pending" && pendingCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5">
          <Clock className="size-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            Có <span className="font-black">{pendingCount}</span> bình luận đang chờ duyệt
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading || filtered.length === 0}
              onClick={() => bulkUpdateStatus("approved")}
              className="h-7 gap-1.5 rounded-lg border-green-500/30 px-2.5 text-xs text-green-600 hover:bg-green-500/10 dark:text-green-400"
            >
              <CheckCheck className="size-3" />
              Duyệt tất cả ({filtered.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading || filtered.length === 0}
              onClick={() => bulkUpdateStatus("rejected")}
              className="h-7 gap-1.5 rounded-lg border-rose-500/30 px-2.5 text-xs text-rose-500 hover:bg-rose-500/10"
            >
              <XCircle className="size-3" />
              Từ chối tất cả
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "KHÔNG TÌM THẤY" : statusFilter === "pending" ? "KHÔNG CÓ BÌNH LUẬN CHỜ DUYỆT" : "KHÔNG CÓ BÌNH LUẬN"}
          description={search ? "Thử từ khóa khác." : "Chưa có bình luận nào trong mục này."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const statusM = STATUS_META[c.status];
            const isLoading = loadingId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-colors",
                  c.status === "pending" && "border-amber-500/20 bg-amber-500/3",
                  c.status === "approved" && "border-green-500/15",
                  c.status === "rejected" && "border-rose-500/15 opacity-70",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white",
                    getColor(c.display_name),
                  )}>
                    {c.display_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{c.display_name}</span>
                      <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase", statusM.bg, statusM.color)}>
                        {statusM.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                        {c.event_id ? `event/${c.event_id.slice(0, 8)}` : c.news_id ? `news/${c.news_id.slice(0, 8)}` : "—"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{c.content}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                  {c.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => updateStatus(c.id, "approved")}
                      className="h-7 gap-1.5 rounded-lg border-green-500/30 px-2.5 text-xs text-green-600 hover:bg-green-500/10 dark:text-green-400"
                    >
                      <Check className="size-3" />
                      Duyệt
                    </Button>
                  )}
                  {c.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => updateStatus(c.id, "rejected")}
                      className="h-7 gap-1.5 rounded-lg border-rose-500/30 px-2.5 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      <X className="size-3" />
                      Từ chối
                    </Button>
                  )}
                  <ConfirmDeleteDialog
                    itemName={`bình luận của ${c.display_name}`}
                    itemType="bình luận"
                    description="Bình luận sẽ bị xóa vĩnh viễn."
                    onConfirm={() => onDelete(c.id)}
                    trigger={
                      <Button size="sm" variant="ghost" className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          {filtered.length} bình luận · Tự động làm mới mỗi 30 giây
        </p>
      )}
    </div>
  );
}
