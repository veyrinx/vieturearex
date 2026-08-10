import Link from "next/link";
import { Clock, PenLine } from "lucide-react";
import { RowHeading } from "@/components/common/row-heading";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";
import type { NewsItem } from "@/lib/types/content";

/**
 * Tin tức — bố cục tạp chí: một bài dẫn kể đủ, bốn bài còn lại xếp danh sách.
 *
 * Dữ liệu tin tức có excerpt, chuyên mục và tên tác giả nhưng lưới ba thẻ cũ
 * vứt hết, chỉ chừa lại tiêu đề với ngày. Bài dẫn ở đây dùng trọn: người đọc
 * biết bài nói gì trước khi bấm, và biết ai viết — hai thứ quyết định họ có
 * tin trang tin hay không.
 */

const MAX_SIDE_ITEMS = 4;

function CategoryChip({ category, onImage = false }: { category: string; onImage?: boolean }) {
  if (!category) return null;
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
        onImage ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary",
      ].join(" ")}
    >
      {category}
    </span>
  );
}

export function NewsShowcase({ news }: { news: NewsItem[] }) {
  const [lead, ...rest] = news;
  if (!lead) return null;
  const side = rest.slice(0, MAX_SIDE_ITEMS);

  return (
    <section className="space-y-4">
      <RowHeading
        title="Tin tức nổi bật"
        subtitle="Tin Esports, cập nhật phiên bản và chuyện cộng đồng"
        href="/news"
      />

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr] lg:gap-5">
        {/* ── Bài dẫn ── */}
        <Link
          href={`/news/${lead.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_44px_hsl(var(--primary)/0.16)]"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            {lead.cover && (
              // Ảnh do admin nhập, host nằm ngoài allowlist của next.config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lead.cover}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            {/* Scrim mỏng mép trên giữ chuyên mục đọc được trên ảnh sáng. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
            {lead.category && (
              <span className="absolute left-3 top-3 md:left-4 md:top-4">
                <CategoryChip category={lead.category} onImage />
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 p-3.5 md:gap-2.5 md:p-5">
            <h3 className="font-heading text-sm font-black uppercase leading-tight tracking-[0.02em] text-foreground line-clamp-2 transition-colors group-hover:text-primary md:text-xl">
              {lead.title}
            </h3>
            {lead.excerpt && (
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 md:text-sm md:line-clamp-3">
                {lead.excerpt}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {lead.created_by_name && (
                <span className="inline-flex items-center gap-1.5">
                  <PenLine className="size-3" />
                  {lead.created_by_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3" />
                {formatVietnamDate(lead.created_at)}
              </span>
            </div>
          </div>
        </Link>

        {/* ── Danh sách phụ ── */}
        {side.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {side.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="group flex flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2.5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_30px_hsl(var(--primary)/0.12)]"
              >
                {/* Ảnh vuông chứ không 16/9: bốn hàng thumb ngang cộng lại sẽ cao
                    hơn bài dẫn bên trái và làm lệch đáy hai cột. */}
                <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-xl bg-muted sm:size-20">
                  {item.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover}
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
                  {item.category && (
                    <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                      {item.category}
                    </span>
                  )}
                  <h3 className="font-heading text-[0.78rem] font-bold uppercase leading-snug tracking-[0.02em] text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {formatVietnamDate(item.created_at)}
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
