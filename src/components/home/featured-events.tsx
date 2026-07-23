"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ArrowRight, ExternalLink, Pencil, Trash2, Plus, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { ServerBadgeClient as ServerBadge } from "@/components/events/server-badge-client";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { EmptyState } from "@/components/common/empty-state";
import { MediaFrame } from "@/components/common/media-frame";
import { EventModal } from "@/components/timeline/event-modal";
import { EventFormDialog } from "@/components/admin/event-form-dialog";
import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import { useAdminRole } from "@/hooks/use-admin-role";

type FeaturedEventsProps = {
  events: EventItem[];
};

type FilterTab = "all" | "active" | "upcoming";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang diễn ra" },
  { value: "upcoming", label: "Sắp mở" },
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
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: vi });
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [editTarget, setEditTarget] = useState<EventItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<EventItem[]>(events);
  const { canEdit } = useAdminRole();

  // Sự kiện hết hạn (end_date đã qua → status "expired") tự động ẩn khỏi trang chủ.
  const liveEvents = localEvents.filter((e) => e.status !== "expired");
  const filtered = activeTab === "all" ? liveEvents : liveEvents.filter((e) => e.status === activeTab);
  const visible = filtered.slice(0, 6);

  const handleDelete = async (event: EventItem) => {
    if (!confirm(`Xóa sự kiện "${event.title}"?`)) return;
    const res = await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id }),
    });
    if (res.ok) {
      setLocalEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success("Đã xóa sự kiện.");
    } else {
      toast.error("Không thể xóa.");
    }
  };

  const handleSaved = async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      const data = await res.json() as { events?: EventItem[] };
      if (data.events) setLocalEvents(data.events);
    }
    setEditOpen(false);
    setCreateOpen(false);
  };

  return (
    <section className="relative space-y-6">
      {/* Aurora nền động — dải màu xoay chậm phía sau khu sự kiện */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-72 w-[85%] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,152,0,0.16), rgba(76,175,80,0.13), rgba(77,124,255,0.16), rgba(168,85,247,0.13), rgba(255,152,0,0.16))",
        }}
        animate={{ rotate: 360, opacity: [0.45, 0.8, 0.45] }}
        transition={{
          rotate: { duration: 44, repeat: Infinity, ease: "linear" },
          opacity: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          eyebrow="Sự kiện"
          icon={CalendarDays}
          title="SỰ KIỆN NỔI BẬT"
          description="Theo dõi nhanh các hoạt động đang chạy và sắp mở trong cộng đồng"
        />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setCreateOpen(true); }}
              className="h-8 gap-1.5 rounded-xl text-xs"
            >
              <Plus className="size-3.5" />
              Thêm sự kiện
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
            <Link href="/events">
              Xem tất cả
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0">
        {TABS.map((tab) => {
          const count = tab.value === "all" ? liveEvents.length : liveEvents.filter((e) => e.status === tab.value).length;
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
        <EmptyState
          icon={CalendarDays}
          title={activeTab === "all" ? "Chưa có sự kiện" : `Không có sự kiện "${TABS.find((t) => t.value === activeTab)?.label}"`}
          description={
            activeTab === "all"
              ? "Sự kiện đang diễn ra và sắp mở sẽ xuất hiện tại đây."
              : "Thử xem toàn bộ sự kiện của cộng đồng."
          }
          action={
            activeTab !== "all" ? (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setActiveTab("all")}>
                Xem tất cả sự kiện
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((event, index) => {
            const progress = event.status === "active" ? getEventProgress(event.start_date, event.end_date) : 0;

            return (
              <Reveal key={event.id} delay={index * 0.07} className="relative">
                {/* Glow nhấp nháy cho sự kiện đang diễn ra */}
                {event.status === "active" && (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -inset-1 -z-10 rounded-[18px] bg-[#ff9800]/25 blur-lg"
                    animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.99, 1.01, 0.99] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <article
                  className={cn(
                    "group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                    statusBorderMap[event.status] ?? "border-border",
                    selectedEvent && selectedEvent.id !== event.id && "opacity-50 scale-[0.98]",
                  )}
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Admin inline edit controls */}
                  {canEdit && (
                    <div className="absolute right-2 top-2 z-50 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditTarget(event); setEditOpen(true); }}
                        className="flex size-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-primary/90"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(event); }}
                        className="flex size-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-destructive/90"
                        title="Xóa"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
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
                    {event.server_region && (
                      <ServerBadge
                        serverKey={event.server_region}
                        className="absolute left-2 top-2 z-30 shadow-sm"
                      />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                    <h3 className="font-heading text-[0.9rem] font-bold uppercase tracking-[0.04em] text-foreground line-clamp-2 text-center leading-snug transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                      {event.title}
                    </h3>

                    {event.created_by_name && (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <User className="size-3 shrink-0" />
                        <span className="font-medium">{event.created_by_name}</span>
                      </div>
                    )}

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

                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "mt-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
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
                  </div>

                  {/* Quick-access link to internal event detail page */}
                  <div className="px-4 pb-4 pt-1">
                    <Link
                      href={`/events/${event.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all",
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

      {canEdit && (
        <>
          <EventFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            initialData={editTarget}
            triggerLabel="Chỉnh sửa"
            showTrigger={false}
            onSaved={handleSaved}
          />
          <EventFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            initialData={null}
            triggerLabel="Tạo mới"
            showTrigger={false}
            onSaved={handleSaved}
          />
        </>
      )}
    </section>
  );
}
