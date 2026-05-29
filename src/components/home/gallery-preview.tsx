"use client";

import { useState } from "react";
import { X, ArrowRight, ZoomIn } from "lucide-react";
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>
      <div
        className="relative max-h-[90dvh] max-w-5xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.tag}
          className="max-h-[85dvh] w-auto max-w-full object-contain"
        />
        {item.tag && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-white">{item.tag}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GalleryPreview({ gallery }: GalleryPreviewProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const items = gallery.slice(0, 6);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Gallery"
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
        <div className="rounded-[14px] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có ảnh nào.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => {
            const isFailed = failedImages.has(item.image_url);
            const isBig = index === 0;
            const isMedium = index === 3;

            return (
              <Reveal key={item.id} delay={index * 0.05}>
                <figure
                  className={[
                    "group relative cursor-pointer overflow-hidden rounded-[14px] border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
                    isBig ? "col-span-2 row-span-2 sm:col-span-1 sm:row-span-2" : "",
                    isMedium ? "sm:col-span-2" : "",
                  ].join(" ")}
                  onClick={() => !isFailed && setLightbox(item)}
                >
                  <div className="relative h-full overflow-hidden rounded-[12px] bg-muted">
                    {isFailed ? (
                      <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                        Lỗi tải ảnh
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.tag}
                        className={[
                          "h-full w-full object-cover transition duration-500 group-hover:scale-110",
                          isBig ? "aspect-[3/4] sm:aspect-auto" : isMedium ? "aspect-[16/7]" : "aspect-[4/3]",
                        ].join(" ")}
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailedImages((p) => new Set(p).add(item.image_url))}
                      />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/35">
                      <div className="flex flex-col items-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        <ZoomIn className="size-8 text-white drop-shadow-lg" />
                        {item.tag && (
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>
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
