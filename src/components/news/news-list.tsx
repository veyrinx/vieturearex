"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isAfter, isBefore, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock, ArrowUpRight, Search, X, User } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { useNewsQuery } from "@/hooks/use-news-query";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NewsItem } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import {
  parseVietnamDateInputEnd,
  parseVietnamDateInputStart,
} from "@/lib/utils/vietnam-time";

type NewsListProps = {
  news: NewsItem[];
};

const sortOptions = [
  { value: "newest", label: "MỚI NHẤT" },
  { value: "oldest", label: "CŨ NHẤT" },
] as const;

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return null;
  }
}

export function NewsList({ news: initialNews }: NewsListProps) {
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [category, setCategory] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<"from" | "to" | null>(null);
  const [displayCount, setDisplayCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: news } = useNewsQuery("published");
  const safeNews = useMemo(() => news ?? initialNews ?? [], [news, initialNews]);

  const categories = useMemo(() => ["all", ...Array.from(new Set(safeNews.map((item) => item.category)))], [safeNews]);

  const filteredNews = useMemo(() => {
    const parsedFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const parsedTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const shouldSwap = Boolean(parsedFrom && parsedTo && isAfter(parsedFrom, parsedTo));
    const from = shouldSwap ? parseVietnamDateInputStart(toDate) : parsedFrom;
    const to = shouldSwap ? parseVietnamDateInputEnd(fromDate) : parsedTo;

    return safeNews
      .filter((item) => {
        const createdAt = new Date(item.created_at);
        const matchCategory = category === "all" ? true : item.category === category;
        const matchFrom = from ? !isBefore(createdAt, from) : true;
        const matchTo = to ? !isAfter(createdAt, to) : true;
        const q = searchQuery.trim().toLowerCase();
        const matchSearch = !q || item.title.toLowerCase().includes(q) || (item.excerpt ?? "").toLowerCase().includes(q);
        return matchCategory && matchFrom && matchTo && matchSearch;
      })
      .sort((a, b) => {
        const left = new Date(a.created_at).getTime();
        const right = new Date(b.created_at).getTime();
        return sort === "newest" ? right - left : left - right;
      });
  }, [category, fromDate, safeNews, sort, toDate, searchQuery]);

  useEffect(() => { setDisplayCount(12); }, [filteredNews]);

  const visibleNews = filteredNews.slice(0, displayCount);
  const hasMore = displayCount < filteredNews.length;

  // Auto-load more when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayCount((c) => c + 12); },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, visibleNews.length]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm tin tức..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none dark:focus:border-amber-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex w-full items-center justify-between md:hidden"
        >
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">BỘ LỌC</span>
          <span className="text-xs text-muted-foreground">{filterOpen ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
        </button>
        <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4", filterOpen ? "mt-3" : "hidden md:grid")}>
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">CHUYÊN MỤC</p>
            <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
              <SelectTrigger className="h-10 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                {categories.map((item) => (
                  <SelectItem key={item} value={item} className="uppercase tracking-[0.08em]">
                    {item === "all" ? "TẤT CẢ" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">SẮP XẾP</p>
            <Select value={sort} onValueChange={(value) => setSort(value as (typeof sortOptions)[number]["value"])}>
              <SelectTrigger className="h-10 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="uppercase tracking-[0.08em]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">TỪ NGÀY</p>
            <DatePickerInput
              value={fromDate}
              onChange={(v) => { setFromDate(v); setActiveDate(null); }}
              forceClose={activeDate === "to"}
              onOpen={() => setActiveDate("from")}
              placeholder="TỪ NGÀY"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">ĐẾN NGÀY</p>
            <DatePickerInput
              value={toDate}
              onChange={(v) => { setToDate(v); setActiveDate(null); }}
              forceClose={activeDate === "from"}
              onOpen={() => setActiveDate("to")}
              placeholder="ĐẾN NGÀY"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      {filteredNews.length > 0 && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {filteredNews.length} bài viết
        </p>
      )}

      {filteredNews.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ TIN TỨC PHÙ HỢP"
          description="Thử đổi chuyên mục hoặc khoảng ngày để xem thêm bài viết."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleNews.map((item, idx) => {
            const ago = timeAgo(item.created_at);
            // Lead article gets a wide, magazine-style treatment (image + text side by side)
            const isFeatured = idx === 0;
            return (
              <article
                key={item.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
                  isFeatured
                    ? "md:col-span-2 md:flex-row hover:shadow-primary/10 dark:hover:shadow-amber-400/10 hover:shadow-2xl"
                    : "hover:-translate-y-0.5 hover:shadow-lg",
                  "hover:border-primary/30 dark:hover:border-amber-400/20",
                )}
              >
                <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
                <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />

                {/* Cover */}
                <div className={cn(
                  "relative overflow-hidden bg-muted",
                  isFeatured ? "md:w-[54%] md:shrink-0" : "",
                )}>
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover}
                      alt={item.title}
                      loading={isFeatured ? "eager" : "lazy"}
                      className={cn(
                        "w-full object-cover transition-opacity duration-500 group-hover:scale-[1.03]",
                        !isFeatured && "opacity-0 [:not([data-loaded='false'])]:opacity-100",
                        isFeatured ? "aspect-[16/9] md:aspect-auto md:h-full md:min-h-[240px]" : "aspect-[16/9]",
                      )}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={cn(
                      "flex items-center justify-center border-b border-dashed border-border bg-muted",
                      isFeatured ? "aspect-[16/9] md:h-full md:min-h-[240px]" : "aspect-[16/9]",
                    )}>
                      <span className="text-xs font-bold uppercase text-muted-foreground/40">ĐANG CẬP NHẬT</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300" />
                  {item.category && (
                    <span className="absolute left-3 top-3 z-30 rounded-md bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-primary-foreground shadow">
                      {item.category}
                    </span>
                  )}
                  {isFeatured && (
                    <span className="absolute right-3 top-3 z-30 rounded-md bg-black/55 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                      Nổi bật
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className={cn("flex flex-1 flex-col gap-2 p-4", isFeatured && "md:justify-center md:p-6")}>
                  <h3 className={cn(
                    "font-heading font-bold uppercase leading-snug tracking-[0.03em] text-foreground line-clamp-2 transition-colors duration-300 group-hover:text-primary dark:group-hover:text-amber-400",
                    isFeatured ? "text-base md:text-2xl" : "text-[0.9rem]",
                  )}>
                    {item.title}
                  </h3>
                  {item.excerpt && (
                    <p className={cn(
                      "text-muted-foreground",
                      isFeatured ? "line-clamp-3 text-sm" : "line-clamp-2 text-[13px]",
                    )}>
                      {item.excerpt}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      {ago && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 shrink-0" />
                          {ago}
                        </span>
                      )}
                      {item.created_by_name && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="flex items-center gap-1">
                            <User className="size-3 shrink-0" />
                            {item.created_by_name}
                          </span>
                        </>
                      )}
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:group-hover:text-amber-400" />
                  </div>
                </div>

                {/* Left accent bar */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-primary/0 transition-all duration-300 group-hover:bg-primary/60 dark:group-hover:bg-amber-400/60" />
              </article>
            );
          })}
        </div>
      )}

      {/* Sentinel — IntersectionObserver tự động load thêm */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setDisplayCount((c) => c + 12)}
            className="rounded-xl px-8"
          >
            Xem thêm ({filteredNews.length - displayCount} bài)
          </Button>
        </div>
      )}
    </div>
  );
}
