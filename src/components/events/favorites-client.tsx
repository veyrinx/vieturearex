"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Bell, CalendarDays, ArrowRight, CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { EventModal } from "@/components/timeline/event-modal";
import { FavoriteButton, FollowButton, useFavoriteEventIds, useFollowedEventIds } from "@/components/events/event-actions";
import type { EventItem } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";
import { cn } from "@/lib/utils";

export function FavoritesClient({ initialEvents }: { initialEvents: EventItem[] }) {
  const favIds = useFavoriteEventIds();
  const followIds = useFollowedEventIds();
  const [selected, setSelected] = useState<EventItem | null>(null);

  const favorites = useMemo(
    () => initialEvents.filter((e) => favIds.includes(e.id)),
    [initialEvents, favIds],
  );
  const followed = useMemo(
    () => initialEvents.filter((e) => followIds.includes(e.id) && !favIds.includes(e.id)),
    [initialEvents, followIds, favIds],
  );

  return (
    <div className="space-y-10">
      <Section
        title="Đã yêu thích"
        icon={<Heart className="size-4 fill-current text-rose-500" />}
        count={favorites.length}
        events={favorites}
        onSelect={setSelected}
        emptyText="Bạn chưa lưu sự kiện nào. Vào trang lịch và bấm tim để bắt đầu."
      />
      <Section
        title="Đang theo dõi"
        icon={<Bell className="size-4 text-primary dark:text-amber-400" />}
        count={followed.length}
        events={followed}
        onSelect={setSelected}
        emptyText="Chưa theo dõi sự kiện nào."
      />

      <EventModal
        event={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </div>
  );
}

function Section({
  title, icon, count, events, onSelect, emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  events: EventItem[];
  onSelect: (e: EventItem) => void;
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground">
          {title}
        </h2>
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {count}
        </span>
        <Link
          href="/lich"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          Xem lịch đầy đủ <ArrowRight className="size-3" />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <CalendarCheck className="size-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{title === "Đã yêu thích" ? "Chưa có sự kiện yêu thích" : "Chưa theo dõi sự kiện nào"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">{emptyText}</p>
          </div>
          <Link href="/events" className="rounded-xl border border-border px-4 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-foreground transition-colors text-muted-foreground">
            Xem sự kiện →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <article
              key={e.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => onSelect(e)}
                className="relative aspect-[16/9] overflow-hidden bg-muted text-left"
              >
                {e.thumbnail_url || e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.thumbnail_url || e.image_url}
                    alt=""
                    className="size-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute left-2 top-2">
                  <StatusBadge status={e.status} />
                </div>
              </button>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className={cn(
                    "line-clamp-2 text-left font-heading text-sm font-bold text-foreground",
                    "group-hover:text-primary",
                  )}
                >
                  {e.title}
                </button>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {formatVietnamDate(e.start_date)} → {formatVietnamDate(e.end_date)}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <FavoriteButton eventId={e.id} title={e.title} />
                  <FollowButton eventId={e.id} title={e.title} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
