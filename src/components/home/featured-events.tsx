"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
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

const featuredStatusCardClassMap = {
  upcoming: "border-[#4CAF50]",
  active: "border-[#ff9800]",
  expired: "border-[#f44336]",
} as const;

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  return (
    <section className="space-y-6">
      <SectionHeading
        title="SỰ KIỆN NỔI BẬT"
        description="THEO DÕI NHANH CÁC HOẠT ĐỘNG ĐANG CHẠY VÀ SẮP MỞ TRONG CỘNG ĐỒNG."
      />

      {selectedEvent && (
        <div
          className="fixed left-0 top-0 z-40 h-screen w-screen bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedEvent(null)}
        />
      )}

      <div className="-mx-4 flex gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 scrollbar-none snap-x snap-mandatory touch-pan-x md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 [&>*]:shrink-0 [&>*]:w-[75vw] [&>*]:snap-center md:[&>*]:w-auto md:[&>*]:snap-align-none">
        {events.slice(0, 3).map((event, index) => (
          <Reveal key={event.id} delay={index * 0.08}>
            <article
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-white px-4 pt-4 pb-2 transition-all duration-300 dark:bg-card",
                featuredStatusCardClassMap[event.status],
                selectedEvent && "opacity-40 scale-[0.98]",
              )}
              onClick={() => setSelectedEvent(event)}
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
                  className="absolute right-0 top-0 z-30 rounded-[6px] px-[7px] py-3 text-[0.8rem] font-bold uppercase shadow-sm"
                />
              </div>

              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <h3 className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 line-clamp-1">
                  {event.title}
                </h3>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

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

