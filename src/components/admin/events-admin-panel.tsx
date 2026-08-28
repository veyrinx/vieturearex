"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  Copy,
  Eye,
  ExternalLink,
  Flame,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useAdminEventsQuery, useInvalidateAdminEvents } from "@/hooks/use-admin-events-query";
import { EventFormDialog } from "@/components/admin/event-form-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import { useEventServers } from "@/hooks/use-event-servers";
import type { EventItem, EventStatus } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";

const PAGE_SIZE = 20;

type StatusFilter = "all" | EventStatus;
type SortKey = "start_desc" | "start_asc" | "views_desc" | "title_asc";

const SELECT_CLASS =
  "h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export function EventsAdminPanel() {
  const { data: events = [], isLoading, isFetching, refetch } = useAdminEventsQuery();
  const invalidate = useInvalidateAdminEvents();
  const servers = useEventServers();

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [duplicating, setDuplicating] = useState<EventItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serverFilter, setServerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("start_desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const serverByKey = useMemo(
    () => Object.fromEntries(servers.map((s) => [s.key, s])),
    [servers],
  );

  const refresh = async () => {
    setSelected([]);
    await invalidate();
  };

  const stats = useMemo(() => {
    return {
      total: events.length,
      active: events.filter((e) => e.status === "active").length,
      upcoming: events.filter((e) => e.status === "upcoming").length,
      expired: events.filter((e) => e.status === "expired").length,
      views: events.reduce((sum, e) => sum + (e.view_count ?? 0), 0),
    };
  }, [events]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = events.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      const eventServer = (event.server_region ?? "").toLowerCase();
      if (serverFilter === "none" && eventServer) return false;
      if (serverFilter !== "all" && serverFilter !== "none" && eventServer !== serverFilter) return false;
      if (!term) return true;
      return (
        event.title.toLowerCase().includes(term) ||
        (event.description ?? "").toLowerCase().includes(term) ||
        (event.created_by_name ?? "").toLowerCase().includes(term)
      );
    });

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "start_asc":
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case "views_desc":
          return (b.view_count ?? 0) - (a.view_count ?? 0);
        case "title_asc":
          return a.title.localeCompare(b.title, "vi");
        default:
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
    });
  }, [events, search, statusFilter, serverFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageIds = paged.map((e) => e.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const resetPage = () => setPage(1);

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePage = () => {
    setSelected((prev) =>
      allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    );
  };

  const deleteEvents = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "XÓA SỰ KIỆN THẤT BẠI.");
        return;
      }
      toast.success(ids.length > 1 ? `ĐÃ XÓA ${ids.length} SỰ KIỆN.` : "ĐÃ XÓA SỰ KIỆN.");
      await refresh();
    } catch {
      toast.error("Lỗi mạng, không thể xóa sự kiện.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const statCards = [
    { label: "TỔNG SỰ KIỆN", value: stats.total, icon: CalendarClock, tone: "text-foreground" },
    { label: "ĐANG DIỄN RA", value: stats.active, icon: Flame, tone: "text-[#ff9800]" },
    { label: "SẮP DIỄN RA", value: stats.upcoming, icon: CalendarPlus, tone: "text-[#4CAF50]" },
    { label: "ĐÃ KẾT THÚC", value: stats.expired, icon: CalendarClock, tone: "text-[#f44336]" },
    { label: "LƯỢT XEM", value: stats.views, icon: Eye, tone: "text-primary" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">
            QUẢN LÝ SỰ KIỆN
          </h1>
          <p className="text-sm text-muted-foreground">
            TẠO, CHỈNH SỬA, XÓA SỰ KIỆN VÀ THEO DÕI MỐC THỜI GIAN THEO MÚI GIỜ VIỆT NAM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Tải lại danh sách"
            aria-label="Tải lại danh sách"
            className="border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
            onClick={() => void refetch()}
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <EventFormDialog
            open={creatingOpen}
            onOpenChange={setCreatingOpen}
            triggerLabel="TẠO SỰ KIỆN"
            onSaved={refresh}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {card.label}
              </p>
              <card.icon className={`size-4 ${card.tone}`} />
            </div>
            <p className={`mt-1 font-heading text-2xl font-bold ${card.tone}`}>
              {card.value.toLocaleString("vi-VN")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Tìm theo tiêu đề, mô tả, người tạo..."
            className="h-10 rounded-xl border-border bg-background pl-9 text-foreground"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            resetPage();
          }}
          className={SELECT_CLASS}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang diễn ra</option>
          <option value="upcoming">Sắp diễn ra</option>
          <option value="expired">Đã kết thúc</option>
        </select>

        <select
          value={serverFilter}
          onChange={(e) => {
            setServerFilter(e.target.value);
            resetPage();
          }}
          className={SELECT_CLASS}
          aria-label="Lọc theo server"
        >
          <option value="all">Tất cả server</option>
          <option value="none">⚠️ Chưa gán server</option>
          {servers.map((s) => (
            <option key={s.key} value={s.key}>
              {s.flag} {s.label}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={SELECT_CLASS}
          aria-label="Sắp xếp"
        >
          <option value="start_desc">Mới nhất</option>
          <option value="start_asc">Cũ nhất</option>
          <option value="views_desc">Xem nhiều nhất</option>
          <option value="title_asc">Tên A → Z</option>
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            ĐÃ CHỌN {selected.length} SỰ KIỆN
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setSelected([])}>
              BỎ CHỌN
            </Button>
            <ConfirmDeleteDialog
              itemName={`${selected.length} sự kiện`}
              itemType="sự kiện"
              description="Toàn bộ sự kiện đã chọn sẽ bị xóa vĩnh viễn, không thể khôi phục."
              onConfirm={() => deleteEvents(selected)}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  disabled={bulkDeleting}
                  className="bg-rose-500 text-white hover:bg-rose-600"
                >
                  <Trash2 className="mr-1.5 size-4" />
                  {bulkDeleting ? "ĐANG XÓA..." : "XÓA ĐÃ CHỌN"}
                </Button>
              }
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI SỰ KIỆN..." />
      ) : events.length === 0 ? (
        <EmptyState title="CHƯA CÓ SỰ KIỆN" description="HÃY TẠO SỰ KIỆN ĐẦU TIÊN ĐỂ BẮT ĐẦU QUẢN LÝ." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="KHÔNG TÌM THẤY SỰ KIỆN"
          description="Không có sự kiện nào khớp với từ khóa hoặc bộ lọc hiện tại."
          icon={Search}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      aria-label="Chọn tất cả trên trang"
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">SỰ KIỆN</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">SERVER</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THỜI GIAN</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TRẠNG THÁI</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">LƯỢT XEM</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">NGƯỜI ĐĂNG</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((event) => {
                  const server = event.server_region ? serverByKey[event.server_region.toLowerCase()] : undefined;
                  const thumb = event.thumbnail_url || event.image_url;
                  return (
                    <tr key={event.id} className="border-t border-border text-foreground">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(event.id)}
                          onChange={() => toggleOne(event.id)}
                          aria-label={`Chọn ${event.title}`}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={event.title}
                              width={64}
                              height={40}
                              unoptimized
                              className="size-10 shrink-0 rounded-lg object-cover md:h-10 md:w-16"
                            />
                          ) : (
                            <div className="size-10 shrink-0 rounded-lg bg-muted md:h-10 md:w-16" />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{event.title}</p>
                            {event.description ? (
                              <p className="line-clamp-1 text-xs text-muted-foreground">{event.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {server ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${server.color}`}
                          >
                            {server.flag} {server.short}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatVietnamDate(event.start_date)} → {formatVietnamDate(event.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(event.view_count ?? 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p className="line-clamp-1">{event.created_by_name ?? "—"}</p>
                        {event.updated_by_name && event.updated_by_name !== event.created_by_name ? (
                          <p className="line-clamp-1">Sửa: {event.updated_by_name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            asChild
                            title="Xem trên trang"
                            className="border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                          >
                            <a href={`/events/${event.id}`} target="_blank" rel="noreferrer" aria-label="Xem trên trang">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            title="Nhân bản sự kiện"
                            aria-label="Nhân bản sự kiện"
                            className="border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                            onClick={() => setDuplicating(event)}
                          >
                            <Copy className="size-4" />
                          </Button>
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
                            onConfirm={() => deleteEvents([event.id])}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <p>
              Hiển thị {paged.length} / {filtered.length} sự kiện
              {filtered.length !== events.length ? ` (tổng ${events.length})` : ""}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  TRƯỚC
                </Button>
                <span className="text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  SAU
                </Button>
              </div>
            ) : null}
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

      <EventFormDialog
        open={Boolean(duplicating)}
        onOpenChange={(open) => {
          if (!open) setDuplicating(null);
        }}
        initialData={duplicating}
        mode="duplicate"
        triggerLabel="NHÂN BẢN"
        showTrigger={false}
        onSaved={refresh}
      />
    </section>
  );
}
