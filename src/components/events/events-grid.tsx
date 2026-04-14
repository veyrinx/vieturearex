"use client";

import { useMemo, useState } from "react";
import { isAfter, isBefore } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { EventModal } from "@/components/timeline/event-modal";
import { MediaFrame } from "@/components/common/media-frame";
import { useEventsQuery } from "@/hooks/use-events-query";
import type { EventItem, EventStatus } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import {
  isEventInCurrentVietnamMonthWindow,
  parseVietnamDateInputEnd,
  parseVietnamDateInputStart,
} from "@/lib/utils/vietnam-time";

type EventsGridProps = {
  initialEvents: EventItem[];
};

const statusOptions: Array<{ value: EventStatus | "all"; label: string }> = [
  { value: "all", label: "TẤT CẢ TRẠNG THÁI" },
  { value: "upcoming", label: "SẮP RA MẮT" },
  { value: "active", label: "ĐANG HOẠT ĐỘNG" },
  { value: "expired", label: "ĐÃ KẾT THÚC" },
];

const sortOptions = [
  { value: "newest", label: "MỚI NHẤT" },
  { value: "oldest", label: "CŨ NHẤT" },
] as const;

const statusCardClassMap: Record<EventStatus, string> = {
  upcoming: "border-[#4CAF50]/70 hover:border-[#4CAF50]",
  active: "border-[#ff9800]/70 hover:border-[#ff9800]",
  expired: "border-border hover:border-muted-foreground",
};

export function EventsGrid({ initialEvents }: EventsGridProps) {
  const [status, setStatus] = useState<EventStatus | "all">("all");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { data = initialEvents } = useEventsQuery({ status });

  const events = useMemo(() => {
    const parsedFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const parsedTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const shouldSwap = Boolean(parsedFrom && parsedTo && isAfter(parsedFrom, parsedTo));
    const from = shouldSwap ? parseVietnamDateInputStart(toDate) : parsedFrom;
    const to = shouldSwap ? parseVietnamDateInputEnd(fromDate) : parsedTo;

    return data
      .filter((event) => {
        const eventStart = new Date(event.start_date);
        const eventEnd = new Date(event.end_date);
        const matchFrom = from ? !isBefore(eventEnd, from) : isEventInCurrentVietnamMonthWindow(event.start_date);
        const matchTo = to ? !isAfter(eventStart, to) : true;
        return matchFrom && matchTo;
      })
      .sort((a, b) => {
        const left = new Date(a.start_date).getTime();
        const right = new Date(b.start_date).getTime();
        return sort === "newest" ? right - left : left - right;
      });
  }, [data, fromDate, sort, toDate]);

  return (
    <>
      {/* Overlay mờ khi có card được chọn */}
      {selectedEvent && (
        <div
          className="fixed left-0 top-0 z-40 h-screen w-screen bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedEvent(null)}
        />
      )}
      <div className="glass-card mb-6 rounded-2xl p-4 md:grid-cols-2 xl:grid-cols-4">
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">TRẠNG THÁI</p>
          <Select value={status} onValueChange={(value) => setStatus(value as EventStatus | "all")}>
            <SelectTrigger className="h-11 w-full border-border bg-background text-foreground uppercase tracking-[0.08em]">
              {statusOptions.find((option) => option.value === status)?.label ?? "TẤT CẢ TRẠNG THÁI"}
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-foreground">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="uppercase tracking-[0.08em]">
                  {option.label}
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
          <DatePickerInput value={fromDate} onChange={setFromDate} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">ĐẾN NGÀY</p>
          <DatePickerInput value={toDate} onChange={setToDate} />
        </div>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ SỰ KIỆN PHÙ HỢP"
          description="THỬ ĐỔI BỘ LỌC HOẶC KHOẢNG NGÀY ĐỂ XEM THÊM SỰ KIỆN."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <article key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-white px-4 pt-4 pb-2 transition-all duration-300 dark:bg-card",
                statusCardClassMap[event.status],
                selectedEvent && "opacity-40 scale-[0.98]",
              )}
            >
              <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
              <div className="relative overflow-hidden rounded-[8px]">
                <MediaFrame
                  src={event.image_url}
                  alt={event.title}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  aspectClassName="aspect-[16/9]"
                  imageClassName="object-cover"
                />
                <StatusBadge
                  status={event.status}
                  className="absolute right-0 top-0 z-30 rounded-[6px] px-[7px] py-3 text-[0.8rem] shadow-sm uppercase font-bold"
                />
              </div>

              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-1">
                  {event.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      )}

      <EventModal
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      />
    </>
  );
}

