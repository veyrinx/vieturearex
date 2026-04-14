"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { MediaFrame } from "@/components/common/media-frame";
import { Button } from "@/components/ui/button";
import type { NewsItem } from "@/lib/types/content";

type LatestNewsProps = {
  news: NewsItem[];
};

export function LatestNews({ news }: LatestNewsProps) {
  return (
    <section className="space-y-6">
      <SectionHeading
        title="TIN TỨC MỚI NHẤT"
        description="BÀI VIẾT MỚI NHẤT ĐƯỢC CẬP NHẬT THEO CHUYÊN MỤC."
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 scrollbar-none snap-x snap-mandatory touch-pan-x md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 [&>*]:shrink-0 [&>*]:w-[75vw] [&>*]:snap-center md:[&>*]:w-auto md:[&>*]:snap-align-none">
        {news.slice(0, 3).map((item, index) => (
          <Reveal key={item.id} delay={index * 0.1}>
            <article className="group relative flex flex-col overflow-hidden rounded-[14px] border bg-white px-4 pt-4 pb-2 transition-all dark:border-border dark:bg-card">
              <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
              <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />

              <div className="relative overflow-hidden rounded-[8px]">
                <MediaFrame
                  src={item.cover}
                  alt={item.title}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  aspectClassName="aspect-[16/9]"
                  imageClassName="object-cover"
                />
              </div>

              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-1">
                  {item.title}
                </h3>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
