"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star, RefreshCw, MessageSquare, ThumbsUp, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type Rating = {
  id: string;
  slug: string;
  title: string;
  anonymous_id: string;
  stars: number;
  review: string | null;
  created_at: string;
  admin_liked?: boolean;
};

async function fetchRatings(): Promise<Rating[]> {
  const res = await fetch("/api/admin/ratings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json() as { ratings: Rating[] };
  return data.ratings ?? [];
}

function StarRow({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < count ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"} />
      ))}
      <span className="text-xs font-bold text-foreground">{count}</span>
      <span className="text-[10px] text-muted-foreground">/ 5</span>
      {total > 0 && (
        <span className="ml-auto text-[10px] text-muted-foreground">{((count / total) * 100).toFixed(0)}%</span>
      )}
    </div>
  );
}

export function RatingsAdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStar, setFilterStar] = useState<number | null>(null);

  const { data: ratings = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["admin-ratings"],
    queryFn: fetchRatings,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });

  const onDelete = async (id: string) => {
    const res = await fetch("/api/admin/ratings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { toast.error("Không thể xóa."); return; }
    toast.success("Đã xóa đánh giá.");
    void queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  const toggleHighlight = async (id: string, current: boolean) => {
    const res = await fetch("/api/admin/ratings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, admin_liked: !current }),
    });
    if (!res.ok) { toast.error("Không thể cập nhật."); return; }
    void queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  const filtered = ratings
    .filter((r) => filterStar === null || r.stars === filterStar)
    .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.anonymous_id.toLowerCase().includes(search.toLowerCase()));

  const avgStars = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
    : "0";
  const fiveStars = ratings.filter((r) => r.stars === 5).length;
  const withReview = ratings.filter((r) => r.review).length;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--";

  if (isLoading) return <LoadingSpinner className="py-10" label="ĐANG TẢI..." />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng đánh giá", value: ratings.length, color: "text-foreground" },
          { label: "Trung bình sao", value: `★ ${avgStars}`, color: "text-yellow-500" },
          { label: "5 sao", value: fiveStars, color: "text-green-500" },
          { label: "Có nội dung", value: withReview, color: "text-blue-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card flex flex-col items-center gap-1 rounded-xl p-3 text-center">
            <span className={cn("text-xl font-black", color)}>{value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài viết hoặc user ID..."
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={filterStar === null ? "default" : "outline"}
            onClick={() => setFilterStar(null)}
            className="h-8 rounded-lg px-2.5 text-xs"
          >
            Tất cả
          </Button>
          {[5, 4, 3, 2, 1].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStar === s ? "default" : "outline"}
              onClick={() => setFilterStar(filterStar === s ? null : s)}
              className="h-8 w-8 rounded-lg p-0 text-xs"
            >
              {s}★
            </Button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-ratings"] })}
          disabled={isFetching}
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          {lastUpdated}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search || filterStar ? "KHÔNG TÌM THẤY" : "CHƯA CÓ ĐÁNH GIÁ"}
          description={search || filterStar ? "Thử thay đổi bộ lọc." : "Chưa có đánh giá nào từ người dùng."}
        />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bài viết</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sao</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nội dung</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngày</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className={cn("transition-colors hover:bg-muted/20", r.admin_liked && "bg-yellow-500/3")}>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="font-semibold line-clamp-1 text-foreground">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">/{r.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} className={i < r.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-yellow-500">{r.stars}/5</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {r.review ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.review}</p>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          <MessageSquare className="size-2.5" /> Không có
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {r.anonymous_id.slice(0, 12)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleHighlight(r.id, r.admin_liked ?? false)}
                          className={cn(
                            "size-8 rounded-lg",
                            r.admin_liked ? "text-yellow-500 hover:bg-yellow-500/10" : "text-muted-foreground hover:text-yellow-500",
                          )}
                          title={r.admin_liked ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                        >
                          <ThumbsUp className="size-3.5" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={r.title}
                          itemType="đánh giá"
                          description="Đánh giá sẽ bị xóa vĩnh viễn và không thể khôi phục."
                          onConfirm={() => onDelete(r.id)}
                          trigger={
                            <Button size="icon" variant="ghost" className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="size-3.5" />
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

          <div className="border-t border-border bg-muted/20 px-4 py-2">
            <p className="text-[10px] text-muted-foreground">
              Hiển thị <span className="font-bold text-foreground">{filtered.length}</span> / {ratings.length} đánh giá · Tự động làm mới mỗi 30 giây
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
