"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, CheckSquare, Square, Send, FileText, Loader2, CalendarClock } from "lucide-react";
import { useAdminNewsQuery, useInvalidateAdminNews } from "@/hooks/use-admin-news-query";
import { NewsEditorDialog } from "@/components/admin/news-editor-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { NewsItem } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";
import { cn } from "@/lib/utils";

const publishStatusLabel: Record<NewsItem["status"], string> = {
  draft: "NHÁP",
  published: "ĐĂNG TẢI",
};

const publishStatusClassMap: Record<NewsItem["status"], string> = {
  draft: "border-sky-400/35 bg-sky-500/10 text-sky-400",
  published: "border-emerald-400/35 bg-emerald-500/10 text-emerald-400",
};

export function NewsAdminPanel() {
  const { data: news = [], isLoading } = useAdminNewsQuery();
  const invalidate = useInvalidateAdminNews();
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const refresh = async () => { await invalidate(); };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(selected.size === news.length ? new Set() : new Set(news.map((n) => n.id)));

  const bulkAction = async (action: "publish" | "draft" | "delete") => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Xóa ${selected.size} bài viết? Không thể khôi phục.`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/news/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action }),
      });
      if (!res.ok) { toast.error("Thao tác thất bại."); return; }
      const d = await res.json() as { affected: number };
      const labels = { publish: "đã xuất bản", draft: "chuyển về nháp", delete: "đã xóa" };
      toast.success(`${d.affected} bài ${labels[action]}.`);
      setSelected(new Set());
      await refresh();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setBulkLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const response = await fetch("/api/admin/news", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) { toast.error("XÓA BÀI VIẾT THẤT BẠI."); return; }
      toast.success("ĐÃ XÓA BÀI VIẾT.");
      await refresh();
    } catch {
      toast.error("Lỗi mạng, không thể xóa bài viết.");
    }
  };

  const allSelected = news.length > 0 && selected.size === news.length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-[0.08em] text-foreground">
            QUẢN LÝ TIN TỨC
          </h1>
          <p className="text-sm text-muted-foreground">
            BIÊN TẬP BÀI VIẾT THEO CÙNG NHỊP GIAO DIỆN VỚI SỰ KIỆN, CÓ DANH MỤC, NGÀY ĐĂNG VÀ TRẠNG THÁI.
          </p>
        </div>
        <NewsEditorDialog
          open={creatingOpen}
          onOpenChange={setCreatingOpen}
          triggerLabel="TẠO BÀI VIẾT"
          onSaved={refresh}
        />
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-xs font-semibold text-primary">
            Đã chọn {selected.size} bài
          </span>
          <div className="ml-auto flex items-center gap-2">
            {bulkLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Button
              size="sm" variant="outline" disabled={bulkLoading}
              onClick={() => bulkAction("publish")}
              className="gap-1.5 h-7 rounded-lg px-3 text-xs border-emerald-400/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Send className="size-3" /> Xuất bản
            </Button>
            <Button
              size="sm" variant="outline" disabled={bulkLoading}
              onClick={() => bulkAction("draft")}
              className="gap-1.5 h-7 rounded-lg px-3 text-xs border-sky-400/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
            >
              <FileText className="size-3" /> Chuyển nháp
            </Button>
            <Button
              size="sm" variant="outline" disabled={bulkLoading}
              onClick={() => bulkAction("delete")}
              className="gap-1.5 h-7 rounded-lg px-3 text-xs border-rose-400/40 text-rose-600 hover:bg-rose-500/10"
            >
              <Trash2 className="size-3" /> Xóa
            </Button>
            <Button
              size="sm" variant="ghost" disabled={bulkLoading}
              onClick={() => setSelected(new Set())}
              className="h-7 rounded-lg px-3 text-xs text-muted-foreground"
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI BÀI VIẾT..." />
      ) : news.length === 0 ? (
        <EmptyState title="CHƯA CÓ BÀI VIẾT" description="HÃY TẠO BÀI VIẾT ĐẦU TIÊN ĐỂ BẮT ĐẦU QUẢN LÝ." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button type="button" onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                      {allSelected
                        ? <CheckSquare className="size-4 text-primary" />
                        : <Square className="size-4" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TIÊU ĐỀ</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">DANH MỤC</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">NGÀY ĐĂNG</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TRẠNG THÁI</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t border-border text-foreground transition-colors",
                      selected.has(item.id) && "bg-primary/5",
                    )}
                  >
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-foreground">
                        {selected.has(item.id)
                          ? <CheckSquare className="size-4 text-primary" />
                          : <Square className="size-4" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="line-clamp-1 font-medium text-foreground">{item.title}</p>
                        <p className="line-clamp-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          /{item.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatVietnamDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${publishStatusClassMap[item.status]}`}
                        >
                          {publishStatusLabel[item.status]}
                        </span>
                        {item.scheduled_at && item.status === "draft" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                            <CalendarClock className="size-3" />
                            {new Date(item.scheduled_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Chỉnh sửa bài viết"
                          aria-label="Chỉnh sửa bài viết"
                          className="border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                          onClick={() => setEditing(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={item.title}
                          itemType="bài viết"
                          description="Toàn bộ nội dung, ảnh bìa và URL slug sẽ bị xóa vĩnh viễn. Các link trỏ tới bài này sẽ bị 404."
                          onConfirm={() => onDelete(item.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="outline"
                              title="Xóa bài viết"
                              aria-label="Xóa bài viết"
                              className="border-rose-400/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewsEditorDialog
        open={Boolean(editing)}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        initialData={editing}
        triggerLabel="CHỈNH SỬA"
        showTrigger={false}
        onSaved={refresh}
      />
    </section>
  );
}
