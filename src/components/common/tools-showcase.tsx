"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/common/section-heading";
import { FEATURED_TOOLS as TOOLS } from "@/lib/constants/tools";

/**
 * Module giới thiệu công cụ trên trang chủ — dạng carousel cuộn ngang,
 * có nút mũi tên điều hướng trên desktop. Dữ liệu lấy từ lib/constants/tools.
 */
export function ToolsShowcase() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
    // Thẻ gần nhất đang ở mép trái (220 + 16 gap).
    setActiveIndex(Math.round(scrollLeft / 236));
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  // Auto-scroll nhẹ: trôi một thẻ mỗi 3.5s, quay về đầu khi hết. Dừng khi
  // hover/chạm hoặc khi người dùng bật giảm chuyển động.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 4;
      // Bề rộng 1 thẻ + gap (220 + 16).
      el.scrollBy({ left: atEnd ? -scrollLeft : 236, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Cuộn ~2 thẻ mỗi lần bấm.
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  const scrollToIndex = (i: number) => {
    scrollerRef.current?.scrollTo({ left: i * 236, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          eyebrow="Người chơi"
          icon={Wrench}
          title="CÔNG CỤ CHO GAME THỦ"
          description="Bộ công cụ miễn phí tối ưu lối chơi Free Fire"
        />
        <div className="flex shrink-0 items-center gap-2">
          {/* Nút điều hướng — chỉ hiện trên desktop */}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="Cuộn về trước"
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-amber-400"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="Cuộn tiếp"
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-amber-400"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <Link
            href="/cong-cu"
            className="group inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary dark:hover:text-amber-400"
          >
            Tất cả
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Hàng cuộn ngang, snap từng thẻ */}
      <div
        ref={scrollerRef}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onFocusCapture={() => { pausedRef.current = true; }}
        className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-8 md:px-8"
      >
        <div className="flex snap-x snap-mandatory gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative flex w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
            >
              <div
                className={cn(
                  "absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-all duration-500 group-hover:scale-[2.5]",
                  tool.gradient,
                )}
              />
              {tool.badge && (
                <span
                  className={cn(
                    "absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm",
                    tool.badge === "MỚI" ? "bg-emerald-500" : "bg-rose-500",
                  )}
                >
                  {tool.badge}
                </span>
              )}
              <div className="relative flex h-full flex-col">
                <div
                  className={cn(
                    "mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                    tool.gradient,
                  )}
                >
                  <tool.icon className="size-5" />
                </div>
                <p className="font-bold text-foreground">{tool.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.shortDesc ?? tool.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                  Mở
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dots indicator — chỉ hiện trên mobile */}
      <div className="flex justify-center gap-1.5 md:hidden">
        {TOOLS.map((tool, i) => (
          <button
            key={tool.href}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Tới công cụ ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === activeIndex
                ? "w-5 bg-primary dark:bg-amber-400"
                : "w-1.5 bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
