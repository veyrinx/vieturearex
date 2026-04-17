"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { MediaFrame } from "@/components/common/media-frame";
import { EventModal } from "@/components/timeline/event-modal";
import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/types/content";
import { cn } from "@/lib/utils";

type FeaturedEventsProps = {
  events: EventItem[];
};

type FilterTab = "all" | "active" | "upcoming" | "expired";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang diễn ra" },
  { value: "upcoming", label: "Sắp mở" },
  { value: "expired", label: "Đã kết thúc" },
];

const statusBorderMap: Record<string, string> = {
  upcoming: "border-[#4CAF50] shadow-[0_0_0_1px_rgba(76,175,80,0.3),0_8px_32px_rgba(76,175,80,0.18)]",
  active: "border-[#ff9800] shadow-[0_0_0_1px_rgba(255,152,0,0.35),0_8px_32px_rgba(255,152,0,0.22)]",
  expired: "border-border/60",
};

function getEventProgress(start: string, end: string): number {
  const now = Date.now();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.round(((now - startMs) / (endMs - startMs)) * 100);
}

function formatEventDate(dateStr: string) {
  return format(new Date(dateStr), "dd/MM/yyyy", { locale: vi });
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = activeTab === "all" ? events : events.filter((e) => e.status === activeTab);
  const visible = filtered.slice(0, 6);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          title="SỰ KIỆN NỔI BẬT"
          description="THEO DÕI NHANH CÁC HOẠT ĐỘNG ĐANG CHẠY VÀ SẮP MỞ TRONG CỘNG ĐỒNG."
        />
        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
          <Link href="/events">
            Xem tất cả
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0">
        {TABS.map((tab) => {
          const count = tab.value === "all" ? events.length : events.filter((e) => e.status === tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-all",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground shadow"
                  : "border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                activeTab === tab.value ? "bg-white/20" : "bg-muted",
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {selectedEvent && (
        <div
          className="fixed left-0 top-0 z-40 h-screen w-screen bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedEvent(null)}
        />
      )}

      {visible.length === 0 ? (
        <div className="rounded-[14px] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Không có sự kiện nào.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((event, index) => {
            const progress = event.status === "active" ? getEventProgress(event.start_date, event.end_date) : 0;

            return (
              <Reveal key={event.id} delay={index * 0.07}>
                <article
                  className={cn(
                    "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-white transition-all duration-300 hover:shadow-lg dark:bg-card",
                    statusBorderMap[event.status] ?? "border-border",
                    selectedEvent && selectedEvent.id !== event.id && "opacity-50 scale-[0.98]",
                  )}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />

                  <div className="relative overflow-hidden rounded-t-[14px]">
                    <MediaFrame
                      src={event.image_url}
                      alt={event.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      aspectClassName="aspect-[16/9]"
                      imageClassName="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <StatusBadge
                      status={event.status}
                      className="absolute right-0 top-0 z-30 rounded-[6px] px-[7px] py-3 text-[0.8rem] font-bold uppercase shadow-sm"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                    <h3 className="font-heading text-[0.9rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-2 text-center leading-snug">
                      {event.title}
                    </h3>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3 shrink-0" />
                      <span className="font-semibold uppercase tracking-[0.05em]">
                        {formatEventDate(event.start_date)}
                        {event.end_date && event.end_date !== event.start_date && (
                          <> → {formatEventDate(event.end_date)}</>
                        )}
                      </span>
                    </div>

                    {event.status === "active" && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          <span>Tiến trình</span>
                          <span className="font-bold text-[#ff9800]">{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="relative h-full rounded-full bg-gradient-to-r from-[#ff9800] to-[#ff5722] transition-all after:absolute after:inset-0 after:animate-pulse after:rounded-full after:bg-white/20"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {event.status === "upcoming" && (() => {
                      const daysLeft = Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86_400_000);
                      if (daysLeft <= 0) return null;
                      return (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#4CAF50]" />
                          <p className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#4CAF50]">
                            Còn {daysLeft} ngày nữa
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      <EventModal
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
      />
    </section>
  );
}
