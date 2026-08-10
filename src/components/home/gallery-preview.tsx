"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ArrowRight, Images, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/lib/types/content";

type GalleryPreviewProps = {
  gallery: GalleryItem[];
};

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const many = items.length > 1;

  const go = useCallback(
    (dir: number) => onIndex((index + dir + items.length) % items.length),
    [index, items.length, onIndex],
  );

  // Điều hướng bằng phím ←/→ và đóng bằng Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-all hover:scale-110"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>

      {many && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 hover:scale-110 md:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="Ảnh tiếp theo"
            className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 hover:scale-110 md:right-6"
          >
            <ChevronRight className="size-6" />
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
          key={item.image_url}
          src={item.image_url}
          alt={item.tag}
          referrerPolicy="no-referrer"
          className="max-h-[85dvh] w-auto max-w-full object-contain animate-in fade-in duration-300"
        />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-5 pt-14">
          {item.tag && (
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-white">{item.tag}</p>
          )}
          {many && (
            <span className="ml-auto shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
              {index + 1} / {items.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const GRID_LAYOUTS = [
  // 0: large portrait left
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

const ASPECT_MAP = [
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-[4/3]",
  "aspect-[16/7]",
  "aspect-[4/3]",
  "aspect-[4/3]",
];

export function GalleryPreview({ gallery }: GalleryPreviewProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const items = gallery.slice(0, 6);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          eyebrow="Gallery"
          icon={Images}
          title="KHOẢNH KHẮC CỘNG ĐỒNG"
          description="Ảnh đẹp từ cộng đồng — nhấn để xem full"
        />
        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
          <Link href="/gallery">
            Xem tất cả
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Chưa có ảnh"
          description="Khoảnh khắc đẹp từ cộng đồng sẽ được đăng tại đây."
          action={
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link href="/gallery">
                Tới thư viện
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 grid-rows-2 gap-2.5 sm:gap-3">
          {items.map((item, index) => {
            const isFailed = failedImages.has(item.image_url);
            const isHot = hovered === item.id;
            const gridClass = GRID_LAYOUTS[index] ?? "col-span-1 row-span-1";
            const aspectClass = ASPECT_MAP[index] ?? "aspect-[4/3]";
            const isFeatured = index === 0;

            return (
              <Reveal key={item.id} delay={index * 0.04}>
                <figure
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ${gridClass} ${
                    isHot
                      ? "border-primary/60 shadow-[0_0_24px_hsl(var(--primary)/0.25)] scale-[1.01]"
                      : "border-border hover:border-primary/40"
                  }`}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !isFailed && setLightboxIndex(index)}
                >
                  <div className={`relative overflow-hidden bg-muted ${!isFeatured ? aspectClass : "h-full"}`}>
                    {isFailed ? (
                      <div className="flex h-full min-h-[120px] items-center justify-center bg-muted text-xs text-muted-foreground">
                        Lỗi tải ảnh
                      </div>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.tag ?? ""}
                          referrerPolicy="no-referrer"
                          className={`h-full w-full object-cover transition-all duration-700 ${isHot ? "scale-110 brightness-90" : "scale-100"} ${!isFeatured ? aspectClass : ""}`}
                          loading="lazy"
                          decoding="async"
                          onError={() => setFailedImages((p) => new Set(p).add(item.image_url))}
                        />

                        {/* Gradient overlay always present */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Featured badge */}
                        {isFeatured && item.tag && (
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="inline-flex rounded-xl bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                              {item.tag}
                            </span>
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isHot ? "opacity-100" : "opacity-0"}`}>
                          <div className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30">
                            <ZoomIn className="size-5 text-white drop-shadow-lg" />
                          </div>
                          {item.tag && !isFeatured && (
                            <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                              {item.tag}
                            </span>
                          )}
                        </div>

                        {/* Corner accent for featured */}
                        {isFeatured && (
                          <div className="absolute left-0 top-0 h-16 w-1 bg-gradient-to-b from-primary to-transparent opacity-80" />
                        )}
                      </>
                    )}
                  </div>
                </figure>
              </Reveal>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
