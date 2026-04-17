"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { MediaFrame } from "@/components/common/media-frame";
import { Button } from "@/components/ui/button";
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

function FeaturedCard({ item }: { item: NewsItem }) {
  const ago = timeAgo(item.published_at ?? item.created_at);
  return (
    <Reveal>
      <article className="group relative flex flex-col overflow-hidden rounded-[18px] border bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 dark:border-border dark:bg-card">
        <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
        <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
        <div className="relative overflow-hidden rounded-[18px]">
          <MediaFrame
            src={item.cover}
            alt={item.title}
            sizes="(max-width: 768px) 100vw, 60vw"
            aspectClassName="aspect-[21/9]"
            imageClassName="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent" />
          {item.category && (
            <span className="absolute left-3 top-3 z-30 rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-lg">
              {item.category}
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-30">
            <h3 className="font-heading text-xl font-bold uppercase tracking-[0.04em] text-white line-clamp-2 drop-shadow-lg md:text-2xl">
              {item.title}
            </h3>
            {ago && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-white/70">
                <div className="size-1.5 rounded-full bg-white/50" />
                <Clock className="size-3 shrink-0" />
                <span className="font-medium">{ago}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function MiniCard({ item, index }: { item: NewsItem; index: number }) {
  const ago = timeAgo(item.published_at ?? item.created_at);
  return (
    <Reveal delay={index * 0.07}>
      <article className="group relative flex gap-3 overflow-hidden rounded-[12px] border bg-white p-3 transition-all duration-200 hover:shadow-md hover:border-primary/30 dark:border-border dark:bg-card dark:hover:border-amber-400/30">
        <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
        <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
        <div className="relative w-24 shrink-0 overflow-hidden rounded-[8px] md:w-28">
          <MediaFrame
            src={item.cover}
            alt={item.title}
            sizes="128px"
            aspectClassName="aspect-[4/3]"
            imageClassName="object-cover transition duration-300 group-hover:scale-105"
          />
          {item.category && (
            <span className="absolute left-1 top-1 z-30 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <h3 className="font-heading text-[0.85rem] font-bold uppercase tracking-[0.03em] text-[#0052ff] dark:text-amber-400 line-clamp-2 transition-opacity group-hover:opacity-80">
            {item.title}
          </h3>
          {ago && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              <span className="font-medium">{ago}</span>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-primary/0 transition-all duration-200 group-hover:bg-primary/60 dark:group-hover:bg-amber-400/60" />
      </article>
    </Reveal>
  );
}

export function LatestNews({ news }: LatestNewsProps) {
  const featured = news[0];
  const rest = news.slice(1, 6);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          title="TIN TỨC MỚI NHẤT"
          description="BÀI VIẾT MỚI NHẤT ĐƯỢC CẬP NHẬT THEO CHUYÊN MỤC."
        />
        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
          <Link href="/news">
            Xem tất cả
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      {news.length === 0 ? (
        <div className="rounded-[14px] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có bài viết nào.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          {featured && <FeaturedCard item={featured} />}
          {rest.length > 0 && (
            <div className="flex flex-col gap-3">
              {rest.map((item, i) => (
                <MiniCard key={item.id} item={item} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
