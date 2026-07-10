"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ResultsBarProps = {
  /** Số kết quả sau khi lọc. */
  count: number;
  /** Danh từ đơn vị, vd "sự kiện", "bài viết", "stream". */
  noun: string;
  /** true khi đang có bộ lọc để hiện nút "Xóa lọc". */
  hasFilters?: boolean;
  /** Bấm để reset toàn bộ bộ lọc. */
  onClear?: () => void;
  className?: string;
};

/**
 * Thanh tóm tắt kết quả cho các trang danh sách (sự kiện / tin tức / stream):
 * hiển thị số lượng đã lọc + nút xóa lọc khi cần. Giữ giao diện các trang list
 * nhất quán với nhau.
 */
export function ResultsBar({ count, noun, hasFilters, onClear, className }: ResultsBarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="tabular-nums text-foreground">{count}</span> {noun}
      </p>
      {hasFilters && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-primary/40 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
        >
          <X className="size-3" /> Xóa lọc
        </button>
      )}
    </div>
  );
}
