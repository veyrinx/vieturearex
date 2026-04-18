"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import type { NewsItem } from "@/lib/types/content";

type NewsTickerProps = {
  news: NewsItem[];
};

export function NewsTicker({ news }: NewsTickerProps) {
  if (news.length === 0) return null;

  const items = [...news, ...news];

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center">
        {/* Label pill */}
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border px-4 py-2">
          <Zap className="size-3.5 shrink-0 fill-primary text-primary dark:fill-amber-400 dark:text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary dark:text-amber-400">
            MỚI NHẤT
          </span>
        </div>

        {/* Scrolling area */}
        <div className="relative flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-card/80 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-card/80 to-transparent" />
          <div className="ticker-track flex w-max gap-0 whitespace-nowrap">
            {items.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/news/${item.slug}`}
                className="inline-flex items-center gap-2.5 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="size-1 shrink-0 rounded-full bg-border" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
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
