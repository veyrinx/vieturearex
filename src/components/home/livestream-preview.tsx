import Link from "next/link";
import { Clock, Radio } from "lucide-react";
import { RowHeading } from "@/components/common/row-heading";
import { formatVietnamDateTime } from "@/lib/utils/vietnam-time";
import type { StreamItem } from "@/lib/types/content";

/**
 * Phát trực tiếp — cùng khuôn với sự kiện và tin tức: một khối dẫn lớn bên
 * trái, danh sách phụ bên phải.
 *
 * Trước đây khối này dùng SectionHeading (tiêu đề 3xl có gradient) trong khi
 * hai khối trên dùng hàng tiêu đề nhỏ — ba cách trình bày cho ba khối cùng cấp
 * làm trang trông như ghép từ nhiều bản thiết kế. Nay cả ba dùng chung
 * RowHeading.
 *
 * Không còn "use client": khối này chưa từng có state, phần client duy nhất là
 * animation Reveal và một onError ẩn ảnh hỏng — không đáng để gửi cả cây
 * component xuống trình duyệt.
 */

const MAX_VISIBLE = 5;

function LiveBadge({ status, size = "md" }: { status: StreamItem["status"]; size?: "sm" | "md" }) {
  const live = status === "live";
  return (
    <span
      className={[
        // w-fit: badge nằm trong flex-col nên mặc định bị kéo giãn hết bề ngang.
        "inline-flex w-fit items-center gap-1.5 rounded-lg font-black uppercase tracking-[0.14em] text-white shadow-sm",
        size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        live ? "bg-live" : "bg-emerald-500",
      ].join(" ")}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
      </span>
      {live ? "Đang live" : "Sắp phát"}
    </span>
  );
}

export function LivestreamPreview({ streams }: { streams: StreamItem[] }) {
  // Đang live trước, rồi tới sắp phát theo giờ lên sóng gần nhất.
  const visible = [
    ...streams.filter((s) => s.status === "live"),
    ...streams
      .filter((s) => s.status === "upcoming")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
  ].slice(0, MAX_VISIBLE);

  const [featured, ...rest] = visible;
  if (!featured) return null;

  return (
    <section className="space-y-4">
      <RowHeading
        title="Phát trực tiếp"
        subtitle="Kênh đang lên sóng và lịch phát sắp tới của cộng đồng"
        href="/esports"
      />

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr] lg:gap-5">
        {/* ── Kênh dẫn ── */}
        <Link
          href="/esports"
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_44px_hsl(var(--primary)/0.16)]"
        >
          <div className="relative aspect-video overflow-hidden bg-black">
            {featured.thumbnail_url && (
              // Ảnh thumbnail lấy từ YouTube, host ngoài allowlist của next.config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.thumbnail_url}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />

            <span className="absolute left-3 top-3 md:left-4 md:top-4">
              <LiveBadge status={featured.status} />
            </span>

            <div className="absolute inset-x-3 bottom-3 space-y-1.5 md:inset-x-5 md:bottom-5">
              <h3 className="font-heading text-base font-black uppercase leading-tight tracking-[0.02em] text-white line-clamp-2 md:text-2xl">
                {featured.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/75">
                <span className="inline-flex items-center gap-1.5">
                  <Radio className="size-3.5" />
                  {featured.category || "Cộng đồng"}
                </span>
                {featured.scheduled_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {formatVietnamDateTime(featured.scheduled_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* ── Danh sách phụ ── */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {rest.map((stream) => (
              <Link
                key={stream.id}
                href="/esports"
                className="group flex flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2.5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_30px_hsl(var(--primary)/0.12)]"
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl bg-black sm:w-28">
                  {stream.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={stream.thumbnail_url}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pr-1">
                  <LiveBadge status={stream.status} size="sm" />
                  <h3 className="font-heading text-[0.78rem] font-bold uppercase leading-snug tracking-[0.02em] text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                    {stream.title}
                  </h3>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {stream.category || "Cộng đồng"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
