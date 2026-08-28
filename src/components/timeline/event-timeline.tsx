"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { Search, Heart, Locate } from "lucide-react";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventModal } from "@/components/timeline/event-modal";
import { useFavoriteEventIds } from "@/components/events/event-actions";
import { ServerBadgeClient as ServerBadge } from "@/components/events/server-badge-client";
import { ServerFilterChips } from "@/components/events/server-filter-chips";
import { useEventsQuery } from "@/hooks/use-events-query";
import type { EventItem, EventStatus } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import {
  formatVietnamDate,
  formatVietnamDayNumber,
  formatVietnamMonthLabel,
  formatVietnamWeekdayShort,
  getVietnamCurrentMonthRange,
  getVietnamDateKey,
  parseVietnamDateInputEnd,
  parseVietnamDateInputStart,
} from "@/lib/utils/vietnam-time";
import { useEventUiStore } from "@/store/use-event-ui-store";

type EventTimelineProps = {
  initialEvents: EventItem[];
};

const dayWidth = 60;

type MonthLabel = {
  label: string;
  start: number;
  end: number;
  width: number;
};

const statusOptions: Array<{ value: EventStatus | "all"; label: string }> = [
  { value: "all", label: "TẤT CẢ TRẠNG THÁI" },
  { value: "upcoming", label: "SẮP DIỄN RA" },
  { value: "active", label: "ĐANG DIỄN RA" },
  { value: "expired", label: "ĐÃ KẾT THÚC" },
];

const timelineStatusClass: Record<EventStatus, string> = {
  upcoming:
    "border-emerald-500/45 bg-gradient-to-r from-emerald-500/22 via-emerald-500/12 to-emerald-400/20 hover:shadow-[0_0_24px_rgba(16,185,129,0.38)]",
  active:
    "border-orange-500/50 bg-gradient-to-r from-orange-500/30 via-orange-500/18 to-amber-400/25 hover:shadow-[0_0_24px_rgba(249,115,22,0.4)]",
  expired:
    "border-rose-500/50 bg-gradient-to-r from-rose-500/25 via-rose-500/16 to-red-400/22 hover:shadow-[0_0_24px_rgba(244,63,94,0.32)]",
};

export function EventTimeline({ initialEvents }: EventTimelineProps) {
  const search = useEventUiStore((state) => state.search);
  const status = useEventUiStore((state) => state.status);
  const selectedEvent = useEventUiStore((state) => state.selectedEvent);
  const setSearch = useEventUiStore((state) => state.setSearch);
  const setStatus = useEventUiStore((state) => state.setStatus);
  const setSelectedEvent = useEventUiStore((state) => state.setSelectedEvent);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [server, setServer] = useState<string>("all");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [thumbErrors, setThumbErrors] = useState<Record<string, boolean>>({});
  const favIds = useFavoriteEventIds();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: events = initialEvents, isLoading } = useEventsQuery({
    search,
    status,
  });

  const { days, rangeStart, rangeEnd, months } = useMemo(() => {
    const rawFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const rawTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const hasDateFilter = Boolean(rawFrom || rawTo);

    let start: Date;
    let end: Date;

    if (hasDateFilter) {
      start = rawFrom ?? parseVietnamDateInputStart(toDate);
      end = rawTo ?? parseVietnamDateInputEnd(fromDate);
      if (isAfter(start, end)) {
        start = parseVietnamDateInputStart(toDate);
        end = parseVietnamDateInputEnd(fromDate);
      }
    } else {
      // Tight-fit default window: start a few days before today (or before the
      // earliest active/upcoming event, whichever is later) and end at the latest
      // active/upcoming event's end_date. Avoids the long blank stretch from the
      // 1st of the month when today is mid-month and from running events past
      // the visible end. Falls back to current-month range when no events.
      const defaultRange = getVietnamCurrentMonthRange();
      const todayStart = startOfDay(new Date());
      const PAD_BEFORE_MS = 3 * 86_400_000;   // 3 ngày đệm trước
      const PAD_AFTER_MS  = 7 * 86_400_000;   // 7 ngày đệm sau
      const HARD_CAP_MS   = 180 * 86_400_000; // tối đa 6 tháng

      const interesting = events.filter((e) => e.status !== "expired");
      if (interesting.length === 0) {
        start = defaultRange.start;
        end   = defaultRange.end;
      } else {
        let minStart = Infinity;
        let maxEnd   = -Infinity;
        for (const e of interesting) {
          const s = new Date(e.start_date).getTime();
          const en = new Date(e.end_date).getTime();
          if (s < minStart) minStart = s;
          if (en > maxEnd) maxEnd = en;
        }
        // Anchor at today: start = min(today − pad, earliestEventStart − pad).
        const anchor = todayStart.getTime();
        const startMs = Math.min(anchor - PAD_BEFORE_MS, minStart - PAD_BEFORE_MS);
        const endMs   = Math.max(anchor + PAD_AFTER_MS,  maxEnd   + PAD_AFTER_MS);
        // Cap total span to 180 days centered on today so a single weird record
        // can't blow up the timeline.
        const cappedStart = Math.max(startMs, anchor - HARD_CAP_MS);
        const cappedEnd   = Math.min(endMs,   anchor + HARD_CAP_MS);
        start = startOfDay(new Date(cappedStart));
        end   = endOfDay(new Date(cappedEnd));
      }
    }

    // For user-supplied date filters, still extend past the right edge so an
    // overlapping event isn't visually chopped — but never extend backward.
    if (hasDateFilter && events.length > 0) {
      const HARD_CAP_MS = 180 * 86_400_000;
      const initialStart = start.getTime();
      const initialEnd   = end.getTime();
      let maxEnd = initialEnd;
      for (const ev of events) {
        const evStart = new Date(ev.start_date).getTime();
        const evEnd   = new Date(ev.end_date).getTime();
        if (evEnd >= initialStart && evStart <= initialEnd && evEnd > maxEnd) {
          maxEnd = Math.min(evEnd, initialStart + HARD_CAP_MS);
        }
      }
      if (maxEnd > end.getTime()) end = endOfDay(new Date(maxEnd));
    }

    const generatedDays = eachDayOfInterval({ start, end });
    const labels: MonthLabel[] = [];

    generatedDays.forEach((day, index) => {
      const label = formatVietnamMonthLabel(day);
      const previous = labels[labels.length - 1];

      if (!previous || previous.label !== label) {
        labels.push({
          label,
          start: index,
          end: index,
          width: dayWidth,
        });
      } else {
        previous.end = index;
        previous.width = (previous.end - previous.start + 1) * dayWidth;
      }
    });

    return {
      days: generatedDays,
      rangeStart: start,
      rangeEnd: end,
      months: labels,
    };
  }, [fromDate, toDate, events]);

  const timelineWidth = days.length * dayWidth;

  // Cùng bộ lọc với visibleEvents nhưng bỏ qua server — chip server đếm trên tập này.
  const serverCountBase = useMemo(() => {
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    return events.filter((event) => {
      if (favoritesOnly && !favIds.includes(event.id)) return false;
      const eventStartMs = new Date(event.start_date).getTime();
      const eventEndMs = new Date(event.end_date).getTime();
      if (Number.isNaN(eventStartMs) || Number.isNaN(eventEndMs)) return false;
      if (eventEndMs < cutoffMs) return false;
      const eventStart = startOfDay(new Date(event.start_date));
      const eventEnd = endOfDay(new Date(event.end_date));
      return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
    });
  }, [events, rangeEnd, rangeStart, favoritesOnly, favIds]);

  const visibleEvents = useMemo(() => {
    // Ẩn events đã kết thúc hơn 24h trước (theo timestamp thực, không clamp giờ địa phương)
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    return events.filter((event) => {
      if (favoritesOnly && !favIds.includes(event.id)) return false;
      if (server !== "all" && (event.server_region ?? "").toLowerCase() !== server) return false;
      const eventStartMs = new Date(event.start_date).getTime();
      const eventEndMs = new Date(event.end_date).getTime();
      if (Number.isNaN(eventStartMs) || Number.isNaN(eventEndMs)) return false;
      if (eventEndMs < cutoffMs) return false;
      const eventStart = startOfDay(new Date(event.start_date));
      const eventEnd = endOfDay(new Date(event.end_date));
      return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
    });
  }, [events, rangeEnd, rangeStart, favoritesOnly, favIds, server]);

  const scrollToToday = () => {
    const todayKey = getVietnamDateKey(new Date());
    const idx = days.findIndex((d) => getVietnamDateKey(d) === todayKey);
    if (idx < 0 || !scrollerRef.current) return;
    const container = scrollerRef.current;
    const target = idx * dayWidth + dayWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  // Auto-center on today when timeline first renders with events
  useEffect(() => {
    if (visibleEvents.length === 0) return;
    const id = window.setTimeout(scrollToToday, 100);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, visibleEvents.length]);

  if (isLoading && events.length === 0) {
    return <LoadingSpinner className="py-20" label="ĐANG TẢI TIMELINE SỰ KIỆN..." />;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex w-full items-center justify-between md:hidden"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">BỘ LỌC</span>
          <span className="text-xs text-muted-foreground">{filterOpen ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
        </button>
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_200px_200px]", filterOpen ? "mt-3" : "hidden md:grid")}>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">TÌM KIẾM</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="TÌM KIẾM EVENT THEO TÊN..."
                className="h-11 border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">TRẠNG THÁI</p>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="h-11 w-full border-border bg-background uppercase tracking-[0.08em] text-foreground">
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
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">TỪ NGÀY</p>
            <DatePickerInput
              value={fromDate}
              onChange={setFromDate}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">ĐẾN NGÀY</p>
            <DatePickerInput
              value={toDate}
              onChange={setToDate}
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className={cn("mt-3 flex flex-wrap items-center gap-2", filterOpen ? "" : "hidden md:flex")}>
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] transition",
              favoritesOnly
                ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
                : "border-border bg-muted text-muted-foreground hover:border-rose-500/40 hover:text-rose-500",
            )}
            title="Chỉ hiển thị sự kiện đã yêu thích"
          >
            <Heart className={cn("size-3.5", favoritesOnly && "fill-current")} />
            Yêu thích của tôi
            {favIds.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px]">{favIds.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={scrollToToday}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground transition hover:border-primary/40 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
            title="Đưa hôm nay vào giữa khung nhìn"
          >
            <Locate className="size-3.5" />
            Hôm nay
          </button>
        </div>

        <ServerFilterChips
          events={serverCountBase}
          value={server}
          onChange={setServer}
          className={cn("mt-2", filterOpen ? "" : "hidden md:flex")}
        />
      </div>

      {visibleEvents.length === 0 ? (
        <div className="space-y-5">
          <EmptyState
            title="KHÔNG CÓ SỰ KIỆN TRONG KHOẢNG NÀY"
            description="HÃY ĐỔI BỘ LỌC TRẠNG THÁI, TỪ KHÓA HOẶC KHOẢNG NGÀY ĐỂ XEM THÊM SỰ KIỆN."
          />
          {(() => {
            const suggestions = events
              .filter((e) => e.status !== "expired")
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .slice(0, 6);
            if (suggestions.length === 0) return null;
            return (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  GỢI Ý — SỰ KIỆN SẮP DIỄN RA
                </p>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEvent(e)}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      {e.thumbnail_url || e.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.thumbnail_url || e.image_url}
                          alt=""
                          className="size-12 shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-12 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                          {e.title}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatVietnamDate(e.start_date)} → {formatVietnamDate(e.end_date)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div ref={scrollerRef} className="overflow-x-auto rounded-2xl border border-border bg-card p-4 md:p-5">
          <div style={{ width: timelineWidth }} className="timeline-track overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card/80 to-card/40 shadow-sm">
            {/* Month band — labels stick to viewport while horizontally scrolling */}
            <div className="flex h-11 border-b border-border bg-muted/40 backdrop-blur-sm" style={{ width: timelineWidth }}>
              {months.map((month) => (
                <div
                  key={`${month.label}-${month.start}`}
                  className="relative shrink-0 border-r border-border last:border-r-0"
                  style={{ width: month.width }}
                >
                  <div className="sticky left-0 flex h-full items-center px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary dark:text-amber-400">
                    {month.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Day header — extra-strong border for Mondays (week boundary) */}
            <div className="flex h-12 border-b border-border bg-background/60" style={{ width: timelineWidth }}>
              {days.map((day, i) => {
                const isToday = getVietnamDateKey(day) === getVietnamDateKey(new Date());
                const wd = day.getDay();
                const isWeekend = wd === 0 || wd === 6;
                const isMonday = wd === 1;
                const nextWd = i + 1 < days.length ? days[i + 1].getDay() : null;
                const weekBreak = nextWd === 1;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative shrink-0 px-0.5 py-1 text-center text-xs last:border-r-0",
                      weekBreak ? "border-r-2 border-border" : "border-r border-border/60",
                      isToday
                        ? "bg-primary/15 text-primary dark:bg-amber-400/15 dark:text-amber-400 font-extrabold"
                        : isWeekend
                          ? "bg-muted/40 text-muted-foreground"
                          : "text-muted-foreground",
                    )}
                    style={{ width: dayWidth }}
                  >
                    <div className={cn("text-[12px] font-bold leading-tight", isMonday && !isToday && "text-foreground")}>
                      {formatVietnamDayNumber(day)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider opacity-80">
                      {formatVietnamWeekdayShort(day)}
                    </div>
                    {isToday && (
                      <span className="absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary dark:bg-amber-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Body — separators and column tints share the exact same column geometry as the header above */}
            <div className="relative min-h-[200px] space-y-1.5 px-0 pb-3 pt-3" style={{ width: timelineWidth }}>
              {/* Full-height column backdrop: weekend tint + today highlight + week-boundary stroke */}
              <div aria-hidden className="pointer-events-none absolute inset-0 flex">
                {days.map((day, i) => {
                  const isToday = getVietnamDateKey(day) === getVietnamDateKey(new Date());
                  const wd = day.getDay();
                  const isWeekend = wd === 0 || wd === 6;
                  const nextWd = i + 1 < days.length ? days[i + 1].getDay() : null;
                  const weekBreak = nextWd === 1;
                  return (
                    <div
                      key={`sep-${i}`}
                      style={{ width: dayWidth }}
                      className={cn(
                        "shrink-0 last:border-r-0",
                        weekBreak ? "border-r-2 border-border/70" : "border-r border-border/40",
                        isToday
                          ? "bg-primary/[0.07] dark:bg-amber-400/[0.07]"
                          : isWeekend
                            ? "bg-muted/15"
                            : undefined,
                      )}
                    />
                  );
                })}
              </div>

              {/* Empty-state placeholder when no events fall in the visible range */}
              {visibleEvents.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                  <div className="sticky left-1/2 -translate-x-1/2 rounded-xl border border-dashed border-border bg-background/80 px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Không có sự kiện trong khoảng này
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      Đổi bộ lọc / khoảng ngày, hoặc bấm <span className="font-bold text-primary dark:text-amber-400">Hôm nay</span> để về điểm hiện tại.
                    </p>
                  </div>
                </div>
              )}
              {/* Today vertical marker (centered in today column) */}
              {(() => {
                const todayKey = getVietnamDateKey(new Date());
                const idx = days.findIndex((d) => getVietnamDateKey(d) === todayKey);
                if (idx < 0) return null;
                return (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-primary/70 shadow-[0_0_8px_rgba(0,0,0,0.15)] dark:bg-amber-400/70"
                    style={{ left: idx * dayWidth + dayWidth / 2 }}
                  />
                );
              })()}
                {visibleEvents.map((event) => {
                  const eventStart = startOfDay(new Date(event.start_date));
                  const eventEnd = endOfDay(new Date(event.end_date));
                  const clampedStart = isBefore(eventStart, rangeStart) ? rangeStart : eventStart;
                  const clampedEnd = isAfter(eventEnd, rangeEnd) ? rangeEnd : eventEnd;
                  const startOffset = Math.max(0, differenceInCalendarDays(clampedStart, rangeStart));
                  const span = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1);
                  const showMeta = span >= 5;
                  const showThumb = span >= 3;

                  return (
                    <div key={event.id} className="relative h-10">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "group absolute top-0 inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg border px-2 text-left transition duration-300",
                          timelineStatusClass[event.status],
                        )}
                        style={{
                          left: startOffset * dayWidth,
                          width: span * dayWidth,
                        }}
                      >
                        {showThumb && (() => {
                          const thumb = event.thumbnail_url?.trim();
                          const img = event.image_url?.trim();
                          const useThumb = thumb && !thumbErrors[event.id];
                          const activeSrc = useThumb ? thumb : img;
                          const allFailed = imgErrors[event.id];

                          if (activeSrc && !allFailed) {
                            return (
                              <div className="relative h-7 w-10 shrink-0 overflow-hidden rounded-[3px]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={activeSrc}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover"
                                  decoding="async"
                                  onError={() => {
                                    if (useThumb && img && img !== thumb) {
                                      setThumbErrors((prev) => ({ ...prev, [event.id]: true }));
                                    } else {
                                      setImgErrors((prev) => ({ ...prev, [event.id]: true }));
                                    }
                                  }}
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                            {event.server_region && (
                              <ServerBadge serverKey={event.server_region} className="shrink-0" />
                            )}
                            <span className="truncate">{event.title}</span>
                          </p>
                          <p className="text-xs text-foreground/85">
                            {formatVietnamDate(event.start_date)}{showMeta ? ` - ${formatVietnamDate(event.end_date)}` : ""}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
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
    </section>
  );
}
