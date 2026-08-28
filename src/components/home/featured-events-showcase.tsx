import Link from "next/link";
import { CalendarDays, Eye, Globe2 } from "lucide-react";
import { RowHeading } from "@/components/common/row-heading";
import { ScrollRow } from "@/components/common/scroll-row";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";
import type { EventItem } from "@/lib/types/content";
import { getEventServer } from "@/lib/constants/event-servers";

/**
 * Sự kiện nổi bật — một thẻ dẫn lớn tràn ngang, phần còn lại chạy ngang bên dưới.
 *
 * Thứ bậc do dữ liệu quyết định: sự kiện đang diễn ra (hoặc sắp tới gần nhất)
 * được kể đầy đủ — ảnh lớn, mô tả, khoảng thời gian, lượt xem — còn phần còn
 * lại rút về hàng thẻ cuộn ngang, nên số sự kiện tăng bao nhiêu cũng không phá
 * bố cục và không đẩy phần dưới trang tụt xuống.
 *
 * Server component: chỉ cái khung cuộn (ScrollRow) chạy ở client.
 */

const MAX_RAIL_ITEMS = 12;

function statusLabel(status: EventItem["status"]) {
  if (status === "active") return "Đang diễn ra";
  if (status === "upcoming") return "Sắp diễn ra";
  return "Đã kết thúc";
}

function StatusBadge({ status, size = "md" }: { status: EventItem["status"]; size?: "sm" | "md" }) {
  const live = status === "active";
  return (
    <span
      className={[
        // w-fit: badge nằm trong flex-col nên mặc định bị kéo giãn hết bề ngang.
        "inline-flex w-fit items-center gap-1.5 rounded-lg font-black uppercase tracking-[0.14em] shadow-sm",
        size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        live
          ? "bg-live text-white"
          : status === "upcoming"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
      ].join(" ")}
    >
      {live && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-white" />
        </span>
      )}
      {statusLabel(status)}
    </span>
  );
}

/** Khoảng thời gian gọn: cùng ngày thì chỉ in một lần thay vì "12/08 – 12/08". */
function dateRange(event: EventItem) {
  const start = formatVietnamDate(event.start_date);
  if (!event.end_date) return start;
  const end = formatVietnamDate(event.end_date);
  return start === end ? start : `${start} – ${end}`;
}

export function FeaturedEventsShowcase({ events }: { events: EventItem[] }) {
  // Đang diễn ra trước, rồi tới sắp diễn ra theo ngày bắt đầu — thứ đang chạy
  // luôn đáng đứng trước thứ còn phải chờ.
  const ordered = [
    ...events.filter((e) => e.status === "active"),
    ...events
      .filter((e) => e.status === "upcoming")
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
  ];

  const [lead, ...rest] = ordered;
  if (!lead) return null;
  const rail = rest.slice(0, MAX_RAIL_ITEMS);

  return (
    <section className="space-y-4">
      <RowHeading
        title="Sự kiện nổi bật"
        subtitle="Sự kiện in-game và hoạt động cộng đồng đang mở"
        href="/calendar"
      />

      {/* ── Thẻ dẫn ── */}
      <Link
        href={`/events/${lead.id}`}
        className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_18px_44px_hsl(var(--primary)/0.16)]"
      >
        {/* Ảnh thấp dần khi màn rộng ra: 16/9 trên điện thoại là vừa mắt, nhưng
            giữ nguyên tỉ lệ đó ở desktop thì thẻ dẫn chiếm gần hết màn hình. */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted sm:aspect-[16/7] lg:aspect-[21/8]">
          {(lead.image_url || lead.thumbnail_url) && (
            // Ảnh do admin nhập, host nằm ngoài allowlist của next.config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.image_url || lead.thumbnail_url}
              alt=""
              aria-hidden
              // Thẻ dẫn nằm ngay dưới hero nên gần như luôn nằm trong màn hình
              // đầu tiên — để lazy là tự tạo một khoảng trống nhấp nháy.
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          {/* Scrim: trên cho nhãn, dưới cho tiêu đề đè lên ảnh. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-black/40" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2 md:inset-x-6 md:top-5">
            <StatusBadge status={lead.status} />
            {lead.view_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[10px] font-bold tabular-nums text-white/85">
                <Eye className="size-3" />
                {lead.view_count.toLocaleString("vi-VN")}
              </span>
            )}
          </div>

          <div className="absolute inset-x-4 bottom-4 max-w-3xl space-y-2 md:inset-x-6 md:bottom-6">
            <h3 className="font-heading text-lg font-black uppercase leading-tight tracking-[0.02em] text-white line-clamp-2 md:text-3xl">
              {lead.title}
            </h3>
            {lead.description && (
              <p className="hidden text-sm leading-relaxed text-white/70 line-clamp-2 md:block">
                {lead.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/75 md:text-xs">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {dateRange(lead)}
              </span>
              {lead.server_region && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="size-3.5" />
                  {getEventServer(lead.server_region)?.label ?? lead.server_region.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* ── Hàng chạy ngang ── */}
      {rail.length > 0 && (
        <ScrollRow label="Các sự kiện khác">
          {rail.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              // basis cố định + shrink-0: thẻ trong vùng cuộn phải giữ nguyên bề
              // ngang, nếu để flex tự co thì cả hàng ép vừa khung và hết cuộn.
              className="group flex w-[15rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_30px_hsl(var(--primary)/0.12)] sm:w-[16.5rem]"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {(event.image_url || event.thumbnail_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url || event.thumbnail_url}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />
                <span className="absolute left-2.5 top-2.5">
                  <StatusBadge status={event.status} size="sm" />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <h3 className="font-heading text-[0.78rem] font-bold uppercase leading-snug tracking-[0.02em] text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                  {event.title}
                </h3>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {dateRange(event)}
                </span>
              </div>
            </Link>
          ))}
        </ScrollRow>
      )}
    </section>
  );
}
