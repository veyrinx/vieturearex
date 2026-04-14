"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DatePickerInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  forceClose?: boolean;
  onOpen?: () => void;
};

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthLabels = [
  "THG 1",
  "THG 2",
  "THG 3",
  "THG 4",
  "THG 5",
  "THG 6",
  "THG 7",
  "THG 8",
  "THG 9",
  "THG 10",
  "THG 11",
  "THG 12",
];

function parseInputDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date());
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "CHỌN NGÀY",
  className,
  forceClose,
  onOpen,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top?: number | string; bottom?: number | string; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 400,
  });
  const selectedDate = useMemo(() => value ? parseInputDate(value) : null, [value]);
  const [cursorDate, setCursorDate] = useState<Date>(selectedDate ?? new Date());

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(Math.max(rect.width, 320), 360);
    const safeLeft = Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12));
    const estimatedPanelHeight = 420;
    const padding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;

    const shouldOpenUpward = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow;

    if (shouldOpenUpward) {
      setPanelStyle({
        bottom: window.innerHeight - rect.top + 8,
        left: safeLeft,
        width: panelWidth,
        maxHeight: Math.max(250, spaceAbove - 8),
      });
    } else {
      setPanelStyle({
        top: rect.bottom + 8,
        left: safeLeft,
        width: panelWidth,
        maxHeight: Math.max(250, spaceBelow - 8),
      });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forceClose) setOpen(false);
  }, [forceClose]);

  useEffect(() => {
    if (selectedDate) {
      setCursorDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePanelPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleViewportChange = () => {
      updatePanelPosition();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePanelPosition]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursorDate]);
  const yearOptions = useMemo(() => {
    const centerYear = cursorDate.getFullYear();
    return Array.from({ length: 15 }, (_, index) => centerYear - 7 + index);
  }, [cursorDate]);

  const displayValue = selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((current) => !current); if (!open) onOpen?.(); }}
        className="theme-control-surface flex h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold uppercase tracking-[0.08em] text-foreground"
      >
        <span className={cn(!selectedDate && "text-muted-foreground")}>{displayValue}</span>
        <CalendarDays className="size-4 text-primary dark:text-amber-300" />
      </button>

      {open && mounted
        ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] pointer-events-auto rounded-[20px] border border-border bg-card p-4 shadow-[0_18px_38px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_52px_rgba(0,0,0,0.34)] overflow-y-auto flex flex-col"
            style={panelStyle}
          >
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCursorDate((current) => subMonths(current, 1))}
                  className="theme-control-surface inline-flex size-9 items-center justify-center rounded-xl"
                  aria-label="THÁNG TRƯỚC"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="grid flex-1 grid-cols-2 gap-2">
                  <select
                    value={cursorDate.getMonth()}
                    onChange={(event) => {
                      const nextMonth = Number(event.target.value);
                      setCursorDate(new Date(cursorDate.getFullYear(), nextMonth, 1));
                    }}
                    className="theme-control-surface h-10 w-full min-w-0 rounded-xl px-2 text-sm font-semibold text-foreground"
                  >
                    {monthLabels.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={cursorDate.getFullYear()}
                    onChange={(event) => {
                      const nextYear = Number(event.target.value);
                      setCursorDate(new Date(nextYear, cursorDate.getMonth(), 1));
                    }}
                    className="theme-control-surface h-10 w-full min-w-0 rounded-xl px-2 text-sm font-semibold text-foreground"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setCursorDate((current) => addMonths(current, 1))}
                  className="theme-control-surface inline-flex size-9 items-center justify-center rounded-xl"
                  aria-label="THÁNG SAU"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {format(cursorDate, "MMMM yyyy", { locale: vi })}
              </p>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {weekdayLabels.map((label) => (
                <span
                  key={label}
                  className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="grid max-h-[18rem] min-h-[12rem] grid-cols-7 gap-1 overflow-y-auto">
              {monthDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, cursorDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      onChange(dayKey);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl text-[11px] font-semibold transition",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(0,82,255,0.2)] dark:shadow-[0_0_20px_-8px_rgba(247,147,26,0.55)]"
                        : "text-foreground hover:bg-primary/10 hover:text-primary dark:hover:text-amber-300",
                      !isCurrentMonth && "text-muted-foreground/45",
                      isToday && !isSelected && "border border-primary/25 bg-primary/5",
                    )}
                  >
                    {format(day, "dd")}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:border-primary/30 hover:text-primary"
              >
                XÓA NGÀY
              </button>

              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  onChange(format(today, "yyyy-MM-dd"));
                  setCursorDate(today);
                  setOpen(false);
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-[0_10px_22px_rgba(0,82,255,0.2)] transition hover:brightness-110 dark:shadow-[0_0_20px_-8px_rgba(247,147,26,0.55)]"
              >
                HÔM NAY
              </button>
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
