"use client";

import { useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { Search } from "lucide-react";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { EventModal } from "@/components/timeline/event-modal";
import { useEventsQuery } from "@/hooks/use-events-query";
import type { EventItem, EventStatus } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import {
  formatVietnamDate,
  formatVietnamDayNumber,
  formatVietnamMonthLabel,
  formatVietnamWeekdayShort,
  getVietnamCurrentMonthRange,
  parseVietnamDateInputEnd,
  parseVietnamDateInputStart,
} from "@/lib/utils/vietnam-time";
import { useEventUiStore } from "@/store/use-event-ui-store";

type EventTimelineProps = {
  initialEvents: EventItem[];
};

const dayWidth = 88;

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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [thumbErrors, setThumbErrors] = useState<Record<string, boolean>>({});

  const { data: events = initialEvents, isLoading } = useEventsQuery({
    search,
    status,
  });

  const { days, rangeStart, rangeEnd, months } = useMemo(() => {
    const defaultRange = getVietnamCurrentMonthRange();
    const rawFrom = fromDate ? parseVietnamDateInputStart(fromDate) : null;
    const rawTo = toDate ? parseVietnamDateInputEnd(toDate) : null;
    const hasDateFilter = Boolean(rawFrom || rawTo);

    let start = hasDateFilter ? rawFrom ?? parseVietnamDateInputStart(toDate) : defaultRange.start;
    let end = hasDateFilter ? rawTo ?? parseVietnamDateInputEnd(fromDate) : defaultRange.end;

    if (isAfter(start, end)) {
      start = parseVietnamDateInputStart(toDate);
      end = parseVietnamDateInputEnd(fromDate);
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
  }, [fromDate, toDate]);

  const timelineWidth = days.length * dayWidth;

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const eventStart = startOfDay(new Date(event.start_date));
      const eventEnd = endOfDay(new Date(event.end_date));
      return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
    });
  }, [events, rangeEnd, rangeStart]);

  if (isLoading && events.length === 0) {
    return <LoadingSpinner className="py-20" label="ĐANG TẢI TIMELINE SỰ KIỆN..." />;
  }

  return (
    <section className="space-y-5">
      <div className="glass-card rounded-2xl p-4 md:p-5">
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex w-full items-center justify-between md:hidden"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">BỘ LỌC</span>
          <span className="text-xs text-muted-foreground">{filterOpen ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
        </button>
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr,220px,200px,200px]", filterOpen ? "mt-3" : "hidden md:grid")}>
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
      </div>

      {visibleEvents.length === 0 ? (
        <EmptyState
          title="KHÔNG CÓ SỰ KIỆN PHÙ HỢP"
          description="HÃY ĐỔI BỘ LỌC TRẠNG THÁI, TỪ KHÓA HOẶC KHOẢNG NGÀY ĐỂ XEM THÊM SỰ KIỆN."
        />
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl border-border p-4 md:p-5">
          <div style={{ width: timelineWidth }} className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="flex h-14" style={{ width: timelineWidth }}>
                {months.map((month) => (
                  <div
                    key={`${month.label}-${month.start}`}
                    className="relative shrink-0 border-r border-border last:border-r-0"
                    style={{ width: month.width }}
                  >
                    <div className="sticky left-0 flex h-full items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {month.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="timeline-track overflow-hidden rounded-2xl border border-border bg-card/70">
              <div className="flex border-b border-border">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="shrink-0 border-r border-border px-1 py-2 text-center text-xs text-muted-foreground last:border-r-0"
                    style={{ width: dayWidth }}
                  >
                    <div>{formatVietnamDayNumber(day)}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">
                      {formatVietnamWeekdayShort(day)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 px-0 pb-2 pt-3">
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
                    <div key={event.id} className="relative h-14">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "group absolute top-0 inline-flex h-14 items-center gap-2 overflow-hidden rounded-xl border px-2 text-left transition duration-300",
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
                              <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-[3px]">
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
                          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
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
