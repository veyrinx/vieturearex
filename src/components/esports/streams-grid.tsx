"use client";

import { useCallback, useState } from "react";
import { Radio } from "lucide-react";
import { StreamModal } from "@/components/esports/stream-modal";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsBar } from "@/components/common/results-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StreamItem, StreamStatus } from "@/lib/types/content";
import { useQuery } from "@tanstack/react-query";
import { buildEmbedUrl } from "@/lib/utils/stream-utils";
import { usePolling } from "@/hooks/use-polling";

// Khoảng nghỉ tối thiểu giữa 2 lần gọi sync, dùng chung cho mọi tab của cùng
// một trình duyệt. Khớp với cooldown 60s phía server.
const SYNC_STAMP_KEY = "arex_streams_sync_at";
const SYNC_MIN_GAP_MS = 60_000;

async function fetchStreams(): Promise<StreamItem[]> {
  const res = await fetch("/api/streams", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load streams.");
  const data = (await res.json()) as { streams: StreamItem[] };
  return data.streams ?? [];
}

type StreamsGridProps = {
  initialStreams: StreamItem[];
  categories?: string[];
};

const statusCardClass: Record<StreamStatus, string> = {
  live: "border-[#FF0000]/70 hover:border-[#FF0000]",
  upcoming: "border-[#4CAF50]/70 hover:border-[#4CAF50]",
  ended: "border-border hover:border-muted-foreground",
};

const statusLabel: Record<StreamStatus, string> = {
  live: "TRỰC TIẾP",
  upcoming: "SẮP DIỄN RA",
  ended: "ĐÃ KẾT THÚC",
};

export function StreamsGrid({ initialStreams, categories = [] }: StreamsGridProps) {
  const { data: streams = initialStreams } = useQuery({
    queryKey: ["streams"],
    queryFn: fetchStreams,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("TẤT CẢ");

  // Đồng bộ trạng thái live với YouTube. Đây là trang công khai nên MỌI khách
  // đều chạy đoạn này — trước đây mỗi người tự bắn /api/streams/sync ngay khi
  // mở trang rồi lặp mỗi 20s, nhân với lượng truy cập thành rất nhiều lần chạy
  // function. Nay: chỉ bắn khi tab đang hiện, nhịp thưa hơn, và mỗi trình duyệt
  // tự giữ khoảng nghỉ riêng để mở nhiều tab cũng không nhân lên.
  const syncStreams = useCallback(async () => {
    const now = Date.now();
    try {
      const last = Number(sessionStorage.getItem(SYNC_STAMP_KEY) ?? 0);
      if (now - last < SYNC_MIN_GAP_MS) return;
      sessionStorage.setItem(SYNC_STAMP_KEY, String(now));
    } catch { /* sessionStorage bị chặn — cứ chạy tiếp */ }
    await fetch("/api/streams/sync", { method: "POST" }).catch(() => null);
  }, []);

  // Chỉ chạy khi thật sự có stream đang live hoặc sắp lên sóng.
  const needsSync = (streams ?? []).some(
    (s) => s.status === "live"
      || (s.status === "upcoming"
        && new Date(s.scheduled_at).getTime() - Date.now() <= 5 * 60 * 1000),
  );
  usePolling(syncStreams, needsSync ? SYNC_MIN_GAP_MS : null);

  const safeStreams = streams ?? [];
  const allCategories = ["TẤT CẢ", ...categories];
  const hasActiveFilters = activeCategory !== "TẤT CẢ";
  const visibleStreams = hasActiveFilters
    ? safeStreams.filter((s) => (s.category ?? "") === activeCategory)
    : safeStreams;

  return (
    <>
      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-xl border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition",
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {selectedStream && (
        <div className="fixed left-0 top-0 z-40 h-screen w-screen bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStream(null)} />
      )}

      {visibleStreams.length > 0 && (
        <ResultsBar
          count={visibleStreams.length}
          noun="stream"
          hasFilters={hasActiveFilters}
          onClear={() => setActiveCategory("TẤT CẢ")}
        />
      )}

      {visibleStreams.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ STREAM NÀO"
          description="Các buổi phát trực tiếp sắp tới sẽ xuất hiện ở đây."
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={() => setActiveCategory("TẤT CẢ")} className="mt-1 rounded-xl">
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleStreams.map((stream: StreamItem) => (
            <article
              key={stream.id}
              onClick={() => setSelectedStream(stream)}
              onMouseEnter={() => setHoveredId(stream.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-card px-4 pt-4 pb-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                statusCardClass[stream.status],
                selectedStream && "opacity-40 scale-[0.98]",
              )}
            >
              <div className="relative overflow-hidden rounded-[8px]">
                <div className="aspect-video w-full overflow-hidden rounded-[8px] bg-black">
                  {stream.thumbnail_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={stream.thumbnail_url} alt={stream.title} className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                {/* Status badge */}
                <Badge variant="outline" className={cn(
                  "absolute right-0 top-0 z-10 inline-flex items-center gap-1.5 rounded-[6px] border px-[7px] py-3 text-[0.8rem] font-bold uppercase leading-none tracking-[0.06em] shadow-[0_4px_12px_rgba(0,0,0,0.18)]",
                  stream.status === "live" && "border-[#ff4444] bg-[#FF0000] text-white",
                  stream.status === "upcoming" && "border-[#81c784] bg-[#4CAF50] text-white",
                  stream.status === "ended" && "border-border bg-muted text-muted-foreground",
                )}>
                  {stream.status === "live" && <Radio className="size-3 animate-pulse" />}
                  {statusLabel[stream.status]}
                </Badge>
                {/* Category badge - ẩn */}
              </div>
              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400 line-clamp-1">
                  {stream.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      )}

      <StreamModal stream={selectedStream} open={Boolean(selectedStream)} onOpenChange={(open) => { if (!open) setSelectedStream(null); }} />

      {hoveredId && (() => {
        const s = visibleStreams.find((x: StreamItem) => x.id === hoveredId);
        if (!s || s.status === "upcoming") return null;
        return (
          <iframe key={hoveredId} src={buildEmbedUrl(s.youtube_url).replace("autoplay=1", "autoplay=0")}
            className="pointer-events-none absolute opacity-0 h-0 w-0" aria-hidden tabIndex={-1} title="preload" />
        );
      })()}
    </>
  );
}
