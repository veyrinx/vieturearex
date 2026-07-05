"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ZoomIn, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { GalleryItem } from "@/lib/types/content";
import { cn } from "@/lib/utils";

type GalleryGridProps = {
  items: GalleryItem[];
};

export function GalleryGrid({ items }: GalleryGridProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tags = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.tag).filter(Boolean)))],
    [items],
  );

  const filtered = useMemo(
    () => (activeTag === "all" ? items : items.filter((i) => i.tag === activeTag)),
    [items, activeTag],
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const showPrev = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i - 1 + filtered.length) % filtered.length)),
    [filtered.length],
  );
  const showNext = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i + 1) % filtered.length)),
    [filtered.length],
  );

  // Reset lightbox when the filter changes to avoid pointing at a stale index
  useEffect(() => { setLightboxIndex(null); }, [activeTag]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, showPrev, showNext]);

  const active = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <Images className="mx-auto mb-3 size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tag filter */}
      {tags.length > 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={cn(
                "inline-flex shrink-0 items-center rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-all",
                activeTag === tag
                  ? "bg-primary text-primary-foreground shadow"
                  : "border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {tag === "all" ? "Tất cả" : tag}
            </button>
          ))}
        </div>
      )}

      {/* Masonry-style responsive grid */}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {filtered.map((item, index) => {
          const isFailed = failed.has(item.image_url);
          return (
            <figure
              key={item.id}
              className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-border transition-all duration-300 hover:border-primary/40 hover:shadow-lg dark:hover:border-amber-400/30"
              onClick={() => !isFailed && setLightboxIndex(index)}
            >
              {isFailed ? (
                <div className="flex min-h-[140px] items-center justify-center bg-muted text-xs text-muted-foreground">
                  Lỗi tải ảnh
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.tag || "Ảnh cộng đồng Free Fire"}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    onError={() => setFailed((p) => new Set(p).add(item.image_url))}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
                      <ZoomIn className="size-5 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  {item.tag && (
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="inline-flex rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                        {item.tag}
                      </span>
                    </figcaption>
                  )}
                </>
              )}
            </figure>
          );
        })}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Đóng"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-all hover:scale-110 hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {filtered.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showPrev(); }}
                aria-label="Ảnh trước"
                className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-black/60 md:left-6"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showNext(); }}
                aria-label="Ảnh tiếp theo"
                className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-black/60 md:right-6"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[90dvh] max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 0 80px rgba(0,82,255,0.15), 0 25px 60px rgba(0,0,0,0.5)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.image_url}
              alt={active.tag || "Ảnh cộng đồng Free Fire"}
              referrerPolicy="no-referrer"
              className="max-h-[85dvh] w-auto max-w-full object-contain"
            />
            {active.tag && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-5 pt-14">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-white">{active.tag}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
