"use client";

import { useMemo, useState } from "react";
import { isAfter, isBefore } from "date-fns";
import { ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { EventModal } from "@/components/timeline/event-modal";
import { MediaFrame } from "@/components/common/media-frame";
import { ServerBadgeClient as ServerBadge } from "@/components/events/server-badge-client";
import { useEventServers } from "@/hooks/use-event-servers";
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
  { value: "upcoming", label: "SẮP DIỄN RA" },
  { value: "active", label: "ĐANG DIỄN RA" },
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
  const [server, setServer] = useState<string>("all");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const eventServers = useEventServers();
  const { data } = useEventsQuery({ status });
  const safeData = useMemo(() => data ?? initialEvents ?? [], [data, initialEvents]);

  const events = useMemo(() => {
    const parsedFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const parsedTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const shouldSwap = Boolean(parsedFrom && parsedTo && isAfter(parsedFrom, parsedTo));
    const from = shouldSwap ? parseVietnamDateInputStart(toDate) : parsedFrom;
    const to = shouldSwap ? parseVietnamDateInputEnd(fromDate) : parsedTo;

    return safeData
      .filter((event) => {
        if (server !== "all" && (event.server_region ?? "vn") !== server) return false;
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
  }, [safeData, fromDate, sort, toDate, server]);

  return (
    <>
      {/* Overlay mờ khi có card được chọn */}
      {selectedEvent && (
        <div
          className="fixed left-0 top-0 z-40 h-screen w-screen bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedEvent(null)}
        />
      )}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
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
              <SelectValue />
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

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">TỪ NGÀY</p>
          <DatePickerInput value={fromDate} onChange={setFromDate} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">ĐẾN NGÀY</p>
          <DatePickerInput value={toDate} onChange={setToDate} />
        </div>
        </div>

        {/* Server chips */}
        <div className={cn("mt-3 flex flex-wrap items-center gap-1.5", filterOpen ? "" : "hidden md:flex")}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">SERVER:</span>
          <button
            type="button"
            onClick={() => setServer("all")}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition",
              server === "all"
                ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400"
                : "border-border bg-muted text-muted-foreground hover:border-primary/40",
            )}
          >
            Tất cả
          </button>
          {eventServers.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setServer(s.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition",
                server === s.key
                  ? s.color
                  : "border-border bg-muted text-muted-foreground hover:border-primary/40",
              )}
            >
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="" className="size-3.5 rounded-sm object-cover" loading="lazy" />
              ) : (
                <span aria-hidden>{s.flag}</span>
              )}
              {s.short}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ SỰ KIỆN PHÙ HỢP"
          description="Thử đổi bộ lọc hoặc khoảng ngày để xem thêm sự kiện."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <article key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                statusCardClassMap[event.status],
                selectedEvent && "opacity-40 scale-[0.98]",
              )}
            >
              <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
              <div className="relative overflow-hidden">
                <MediaFrame
                  src={event.image_url}
                  alt={event.title}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  aspectClassName="aspect-[16/9]"
                  imageClassName="object-cover transition duration-500 group-hover:scale-105"
                />
                <StatusBadge
                  status={event.status}
                  className="absolute right-0 top-0 z-30 rounded-[6px] px-[7px] py-3 text-[0.8rem] shadow-sm uppercase font-bold"
                />
                {event.server_region && (
                  <ServerBadge
                    serverKey={event.server_region}
                    className="absolute left-2 top-2 z-30 shadow-sm"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3 text-center">
                <h3 className="font-heading text-[0.9rem] font-bold uppercase tracking-[0.04em] text-foreground line-clamp-2 leading-snug transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                  {event.title}
                </h3>
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
                      event.status === "active"
                        ? "border border-[#ff9800]/40 bg-[#ff9800]/10 text-[#ff9800] hover:bg-[#ff9800]/20"
                        : event.status === "upcoming"
                          ? "border border-[#4CAF50]/40 bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20"
                          : "border border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    Tham gia sự kiện
                  </a>
                )}
                <Link
                  href={`/events/${event.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
                    event.status === "active"
                      ? "border-[#ff9800]/30 bg-[#ff9800]/8 text-[#ff9800] hover:bg-[#ff9800]/15"
                      : event.status === "upcoming"
                        ? "border-[#4CAF50]/30 bg-[#4CAF50]/8 text-[#4CAF50] hover:bg-[#4CAF50]/15"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <ArrowRight className="size-3 shrink-0" />
                  Truy cập sự kiện
                </Link>
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

