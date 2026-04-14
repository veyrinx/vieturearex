"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isAfter, isBefore } from "date-fns";
import { ArrowUpRight } from "lucide-react";
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

export function NewsList({ news: initialNews }: NewsListProps) {
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [category, setCategory] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<"from" | "to" | null>(null);
  const { data: news = initialNews } = useNewsQuery("published");

  const categories = useMemo(() => ["all", ...Array.from(new Set(news.map((item) => item.category)))], [news]);

  const filteredNews = useMemo(() => {
    const parsedFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const parsedTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const shouldSwap = Boolean(parsedFrom && parsedTo && isAfter(parsedFrom, parsedTo));
    const from = shouldSwap ? parseVietnamDateInputStart(toDate) : parsedFrom;
    const to = shouldSwap ? parseVietnamDateInputEnd(fromDate) : parsedTo;

    return news
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
  }, [category, fromDate, news, sort, toDate]);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex w-full items-center justify-between md:hidden"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">BỘ LỌC</span>
          <span className="text-xs text-muted-foreground">{filterOpen ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
        </button>
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", filterOpen ? "mt-3" : "hidden md:grid")}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">CHUYÊN MỤC</p>
          <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
            <SelectTrigger className="h-11 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
              {category === "all" ? "TẤT CẢ CHUYÊN MỤC" : category}
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

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">SẮP XẾP</p>
          <Select value={sort} onValueChange={(value) => setSort(value as (typeof sortOptions)[number]["value"])}>
            <SelectTrigger className="h-11 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
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

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">TỪ NGÀY</p>
          <DatePickerInput
            value={fromDate}
            onChange={(v) => { setFromDate(v); setActiveDate(null); }}
            forceClose={activeDate === "to"}
            onOpen={() => setActiveDate("from")}
            placeholder="TỪ NGÀY"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">ĐẾN NGÀY</p>
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

      {filteredNews.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ TIN TỨC PHÙ HỢP"
          description="THỬ ĐỔI CHUYÊN MỤC HOẶC KHOẢNG NGÀY ĐỂ XEM THÊM BÀI VIẾT."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNews.map((item) => (
            <article key={item.id} className="group relative flex flex-col overflow-hidden rounded-[14px] border bg-white px-4 pt-4 pb-2 transition-all dark:border-border dark:bg-card">
              <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
              <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />

              <div className="relative overflow-hidden rounded-[8px]">
                {item.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-full aspect-[16/9] object-cover rounded-[8px]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="aspect-[16/9] flex items-center justify-center border-2 border-dashed border-border rounded-[8px]">
                    <span className="text-sm font-bold uppercase text-foreground/40">ĐANG CẬP NHẬT</span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-1">
                  {item.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
