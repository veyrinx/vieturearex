"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { MediaFrame } from "@/components/common/media-frame";
import type { NewsItem } from "@/lib/types/content";

type LatestNewsProps = {
  news: NewsItem[];
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return null;
  }
}

export function LatestNews({ news }: LatestNewsProps) {
  return (
    <section className="space-y-6">
      <SectionHeading
        title="TIN TỨC MỚI NHẤT"
        description="BÀI VIẾT MỚI NHẤT ĐƯỢC CẬP NHẬT THEO CHUYÊN MỤC."
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 scrollbar-none snap-x snap-mandatory touch-pan-x md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 [&>*]:shrink-0 [&>*]:w-[75vw] [&>*]:snap-center md:[&>*]:w-auto md:[&>*]:snap-align-none">
        {news.slice(0, 3).map((item, index) => {
          const ago = timeAgo(item.published_at ?? item.created_at);

          return (
            <Reveal key={item.id} delay={index * 0.1}>
              <article className="group relative flex flex-col overflow-hidden rounded-[14px] border bg-white transition-all dark:border-border dark:bg-card">
                <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
                <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />

                <div className="relative overflow-hidden rounded-t-[14px]">
                  <MediaFrame
                    src={item.cover}
                    alt={item.title}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    aspectClassName="aspect-[16/9]"
                    imageClassName="object-cover"
                  />
                  {item.category && (
                    <span className="absolute left-2 top-2 z-30 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-foreground shadow">
                      {item.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                  <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-2 text-center">
                    {item.title}
                  </h3>

                  {ago && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      <span className="font-medium">{ago}</span>
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
