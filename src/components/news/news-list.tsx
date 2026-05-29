"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isAfter, isBefore, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock, ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { useNewsQuery } from "@/hooks/use-news-query";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
        return matchCategory && matchFrom && matchTo;
      })
      .sort((a, b) => {
        const left = new Date(a.created_at).getTime();
        const right = new Date(b.created_at).getTime();
        return sort === "newest" ? right - left : left - right;
      });
  }, [category, fromDate, safeNews, sort, toDate]);

  useEffect(() => { setDisplayCount(12); }, [filteredNews]);

  const visibleNews = filteredNews.slice(0, displayCount);
  const hasMore = displayCount < filteredNews.length;

  return (
    <div className="space-y-4">
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
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", filterOpen ? "mt-3" : "hidden md:grid")}>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">CHUYÊN MỤC</p>
            <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
              <SelectTrigger className="h-10 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
                {category === "all" ? "TẤT CẢ" : category}
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                {categories.map((item) => (
                  <SelectItem key={item} value={item} className="uppercase tracking-[0.08em]">
                    {item === "all" ? "TẤT CẢ CHUYÊN MỤC" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SẮP XẾP</p>
            <Select value={sort} onValueChange={(value) => setSort(value as (typeof sortOptions)[number]["value"])}>
              <SelectTrigger className="h-10 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
                {sortOptions.find((option) => option.value === sort)?.label ?? "MỚI NHẤT"}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">TỪ NGÀY</p>
            <DatePickerInput
              value={fromDate}
              onChange={(v) => { setFromDate(v); setActiveDate(null); }}
              forceClose={activeDate === "to"}
              onOpen={() => setActiveDate("from")}
              placeholder="TỪ NGÀY"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">ĐẾN NGÀY</p>
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
          {visibleNews.map((item) => {
            const ago = timeAgo(item.created_at);
            return (
              <article
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30 dark:hover:border-amber-400/20"
              >
                <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
                <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />

                {/* Cover */}
                <div className="relative overflow-hidden">
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center border-b border-dashed border-border bg-muted">
                      <span className="text-xs font-bold uppercase text-muted-foreground/40">ĐANG CẬP NHẬT</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {item.category && (
                    <span className="absolute left-3 top-3 z-30 rounded-md bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-primary-foreground shadow">
                      {item.category}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-heading text-[0.9rem] font-bold uppercase leading-snug tracking-[0.03em] text-foreground line-clamp-2 transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                    {item.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    {ago && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        <span>{ago}</span>
                      </div>
                    )}
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

      {hasMore && (
        <div className="flex justify-center pt-2">
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
