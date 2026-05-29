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
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary to-primary/90 dark:from-amber-500/90 dark:via-amber-400 dark:to-amber-500/90" />
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,0.06) 60px,rgba(255,255,255,0.06) 61px)" }}
      />

      <div className="relative flex items-center">
        {/* Label pill */}
        <div className="flex shrink-0 items-center gap-2 bg-black/20 px-4 py-2.5 backdrop-blur-sm">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          <Zap className="size-3.5 shrink-0 fill-white text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white">
            MỚI NHẤT
          </span>
        </div>

        {/* Divider */}
        <div className="h-full w-px bg-white/20" />

        {/* Scrolling area */}
        <div className="relative flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-primary to-transparent dark:from-amber-400/90" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-primary to-transparent dark:from-amber-400/90" />

          <div className="ticker-track flex w-max gap-0 whitespace-nowrap">
            {items.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/news/${item.slug}`}
                className="inline-flex items-center gap-3 px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/90 transition-colors hover:text-white"
              >
                <span className="size-1 shrink-0 rounded-full bg-white/50" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track { animation: ticker-scroll 42s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
