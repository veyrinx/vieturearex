"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useNewsQuery } from "@/hooks/use-news-query";
import { NewsEditorDialog } from "@/components/admin/news-editor-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { NewsItem } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";

const publishStatusLabel: Record<NewsItem["status"], string> = {
  draft: "NHÁP",
  published: "ĐĂNG TẢI",
};

const publishStatusClassMap: Record<NewsItem["status"], string> = {
  draft: "border-sky-400/35 bg-sky-500/10 text-sky-400",
  published: "border-emerald-400/35 bg-emerald-500/10 text-emerald-400",
};

export function NewsAdminPanel() {
  const queryClient = useQueryClient();
  const { data: news = [], isLoading } = useNewsQuery("all");
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["news"] });
  };

  const onDelete = async (id: string) => {
    const response = await fetch("/api/admin/news", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      toast.error("XÓA BÀI VIẾT THẤT BẠI.");
      return;
    }

    toast.success("ĐÃ XÓA BÀI VIẾT.");
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
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

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI BÀI VIẾT..." />
      ) : news.length === 0 ? (
        <EmptyState title="CHƯA CÓ BÀI VIẾT" description="HÃY TẠO BÀI VIẾT ĐẦU TIÊN ĐỂ BẮT ĐẦU QUẢN LÝ." />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TIÊU ĐỀ</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">DANH MỤC</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">NGÀY ĐĂNG</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TRẠNG THÁI</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item) => (
                  <tr key={item.id} className="border-t border-border text-foreground">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="line-clamp-1 font-medium text-foreground">{item.title}</p>
                        <p className="line-clamp-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          /{item.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatVietnamDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${publishStatusClassMap[item.status]}`}
                      >
                        {publishStatusLabel[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Chỉnh sửa bài viết"
                          className="border-border bg-card text-foreground"
                          onClick={() => setEditing(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Xóa bài viết"
                          className="border-rose-400/40 bg-rose-500/10 text-rose-500"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        initialData={editing}
        triggerLabel="CHỈNH SỬA"
        showTrigger={false}
        onSaved={refresh}
      />
    </section>
  );
}
