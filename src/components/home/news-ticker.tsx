"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { NewsItem } from "@/lib/types/content";

type NewsTickerProps = {
  news: NewsItem[];
};

export function NewsTicker({ news }: NewsTickerProps) {
  if (news.length === 0) return null;

  const items = [...news, ...news];

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-primary/20 bg-primary/5 backdrop-blur-sm dark:border-primary/30 dark:bg-primary/10">
      <div className="flex items-center">
        <div className="flex shrink-0 items-center gap-2 border-r border-primary/20 bg-primary px-4 py-2.5 text-primary-foreground dark:border-primary/40">
          <Megaphone className="size-3.5 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">TIN NÓNG</span>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background/80 to-transparent" />
          <div className="ticker-track flex w-max gap-0 whitespace-nowrap">
            {items.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/news/${item.slug}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-foreground/80 transition-colors hover:text-primary"
              >
                <span className="size-1 shrink-0 rounded-full bg-primary/60" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll 35s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
