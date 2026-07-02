"use client";

import { useState } from "react";
import { X, ZoomIn, ArrowRight, Images } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/lib/types/content";

type GalleryPreviewProps = {
  gallery: GalleryItem[];
};

function Lightbox({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-all hover:scale-110"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>
      <div
        className="relative max-h-[90dvh] max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 0 80px rgba(0,82,255,0.15), 0 25px 60px rgba(0,0,0,0.5)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.tag}
          className="max-h-[85dvh] w-auto max-w-full object-contain"
        />
        {item.tag && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-5 pt-14">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-white">{item.tag}</p>
          </div>
        )}
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
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const items = gallery.slice(0, 6);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
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
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Images className="size-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
        </div>
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
                      ? "border-primary/60 shadow-[0_0_24px_rgba(0,82,255,0.25)] dark:border-amber-400/60 dark:shadow-[0_0_24px_rgba(252,211,77,0.2)] scale-[1.01]"
                      : "border-border hover:border-primary/40 dark:hover:border-amber-400/30"
                  }`}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !isFailed && setLightbox(item)}
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
                          <div className="absolute left-0 top-0 h-16 w-1 bg-gradient-to-b from-primary to-transparent dark:from-amber-400 opacity-80" />
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

      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}
