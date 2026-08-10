import Link from "next/link";
import { RowHeading } from "@/components/common/row-heading";
import type { GalleryItem } from "@/lib/types/content";

/**
 * Dải ảnh cộng đồng — một hàng ô vuông, không phải khối mosaic.
 *
 * Bố cục tạp chí sống bằng mật độ: ảnh ở đây là gia vị chứ không phải món
 * chính, nên nó chỉ chiếm một dải mỏng. Ô vuông đều nhau để 6 ảnh chia trọn ở
 * mọi breakpoint (3 cột mobile, 6 cột từ sm) — không hàng cụt, không quy tắc
 * span nào để sai.
 */

const STRIP_SIZE = 6;

export function GalleryStrip({ gallery }: { gallery: GalleryItem[] }) {
  const items = gallery.filter((g) => Boolean(g.image_url)).slice(0, STRIP_SIZE);
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <RowHeading title="Ảnh cộng đồng" href="/gallery" hrefLabel="Tất cả" />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/gallery"
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.tag || ""}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25" />
          </Link>
        ))}
      </div>
    </section>
  );
}
