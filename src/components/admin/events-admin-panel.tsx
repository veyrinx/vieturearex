"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useAdminEventsQuery, useInvalidateAdminEvents } from "@/hooks/use-admin-events-query";
import { EventFormDialog } from "@/components/admin/event-form-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import type { EventItem } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";

export function EventsAdminPanel() {
  const { data: events = [], isLoading } = useAdminEventsQuery();
  const invalidate = useInvalidateAdminEvents();
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);

  const refresh = async () => {
    await invalidate();
  };

  const onDelete = async (id: string) => {
    const response = await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      toast.error("XÓA SỰ KIỆN THẤT BẠI.");
      return;
    }

    toast.success("ĐÃ XÓA SỰ KIỆN.");
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
            QUẢN LÝ SỰ KIỆN
          </h1>
          <p className="text-sm text-muted-foreground">
            TẠO, CHỈNH SỬA, XÓA SỰ KIỆN VÀ THEO DÕI MỐC THỜI GIAN THEO MÚI GIỜ VIỆT NAM.
          </p>
        </div>
        <EventFormDialog
          open={creatingOpen}
          onOpenChange={setCreatingOpen}
          triggerLabel="TẠO SỰ KIỆN"
          onSaved={refresh}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI SỰ KIỆN..." />
      ) : events.length === 0 ? (
        <EmptyState title="CHƯA CÓ SỰ KIỆN" description="HÃY TẠO SỰ KIỆN ĐẦU TIÊN ĐỂ BẮT ĐẦU QUẢN LÝ." />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TIÊU ĐỀ</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THỜI GIAN</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TRẠNG THÁI</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-border text-foreground">
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 font-medium">{event.title}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatVietnamDate(event.start_date)} → {formatVietnamDate(event.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Chỉnh sửa thông tin sự kiện"
                          aria-label="Chỉnh sửa sự kiện"
                          className="border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                          onClick={() => setEditing(event)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={event.title}
                          itemType="sự kiện"
                          description="Toàn bộ thông tin sự kiện bao gồm ảnh, liên kết và thời gian sẽ bị xóa vĩnh viễn."
                          onConfirm={() => onDelete(event.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="outline"
                              title="Xóa sự kiện"
                              aria-label="Xóa sự kiện"
                              className="border-rose-400/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EventFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        initialData={editing}
        triggerLabel="CHỈNH SỬA"
        showTrigger={false}
        onSaved={refresh}
      />
    </section>
  );
}
