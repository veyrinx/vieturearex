"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  itemId: string;
  itemTitle: string;
  itemImage?: string;
  itemType?: string;
};

export function BookmarkButton({ itemId, itemTitle, itemImage, itemType = "news" }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/favorites?item_type=${itemType}&item_id=${itemId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { bookmarked?: boolean } | null) => {
        if (d) setBookmarked(d.bookmarked ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [itemId, itemType]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      if (bookmarked) {
        const res = await fetch(
          `/api/user/favorites?item_type=${itemType}&item_id=${itemId}`,
          { method: "DELETE" },
        );
        if (res.status === 401) { toast.error("Đăng nhập để lưu bài viết"); return; }
        if (res.ok) { setBookmarked(false); toast.success("Đã bỏ lưu"); }
      } else {
        const res = await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_type: itemType, item_id: itemId, item_title: itemTitle, item_image: itemImage }),
        });
        if (res.status === 401) { toast.error("Đăng nhập để lưu bài viết"); return; }
        if (res.ok) { setBookmarked(true); toast.success("Đã lưu vào bookmark"); }
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? "Bỏ lưu" : "Lưu bài viết"}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
        bookmarked
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
        loading && "opacity-50 cursor-not-allowed",
      )}
    >
      <Bookmark className={cn("size-3.5 transition-all", bookmarked && "fill-current")} />
      {bookmarked ? "Đã lưu" : "Lưu bài"}
    </button>
  );
}
