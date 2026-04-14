"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";

type Rating = { id: string; slug: string; title: string; anonymous_id: string; stars: number; review: string | null; created_at: string };

async function fetchRatings(): Promise<Rating[]> {
  const res = await fetch("/api/admin/ratings");
  if (!res.ok) throw new Error("Failed");
  const data = await res.json() as { ratings: Rating[] };
  return data.ratings;
}

export function RatingsAdminPanel() {
  const queryClient = useQueryClient();
  const { data: ratings = [], isLoading } = useQuery({ queryKey: ["admin-ratings"], queryFn: fetchRatings });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Xóa đánh giá này?")) return;
    setDeletingId(id);
    const res = await fetch("/api/admin/ratings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    if (!res.ok) { toast.error("Không thể xóa."); return; }
    toast.success("Đã xóa đánh giá.");
    void queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  if (isLoading) return <LoadingSpinner className="py-10" label="ĐANG TẢI..." />;
  if (ratings.length === 0) return <EmptyState title="CHƯA CÓ ĐÁNH GIÁ" description="Chưa có đánh giá nào từ người dùng." />;

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 uppercase tracking-[0.08em]">BÀI VIẾT</th>
            <th className="px-4 py-3 uppercase tracking-[0.08em]">NGƯỜI DÙNG</th>
            <th className="px-4 py-3 uppercase tracking-[0.08em]">SAO</th>
            <th className="px-4 py-3 uppercase tracking-[0.08em]">NỘI DUNG</th>
            <th className="px-4 py-3 uppercase tracking-[0.08em]">NGÀY</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ratings.map((r) => (
            <tr key={r.id} className="border-t border-border text-foreground">
              <td className="px-4 py-3 max-w-[180px]">
                <p className="font-medium line-clamp-1">{r.title}</p>
                <p className="text-xs text-muted-foreground">/{r.slug}</p>
              </td>
              <td className="px-4 py-3 text-xs font-semibold">{r.anonymous_id}</td>
              <td className="px-4 py-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 max-w-[200px] text-muted-foreground text-xs line-clamp-2">{r.review ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-4 py-3">
                <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                  disabled={deletingId === r.id} onClick={() => onDelete(r.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
