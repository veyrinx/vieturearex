/* eslint-disable @next/next/no-img-element -- ảnh do creator tải lên, host Supabase/ImageKit */
import Link from "next/link";
import { Eye, Heart, Map as MapIcon, Sparkles, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import { craftlandMapHref } from "@/lib/constants/craftland";
import type { CraftlandMapCard } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(n: number) {
  return nf.format(n);
}

export function MapCard({
  map,
  categoryName,
  layout = "grid",
}: {
  map: CraftlandMapCard;
  categoryName?: string;
  layout?: "grid" | "list";
}) {
  const avg = map.rating_count > 0 ? map.rating_sum / map.rating_count : null;
  const list = layout === "list";

  return (
    <Link
      href={craftlandMapHref(map.slug)}
      className={cn(
        "group flex overflow-hidden rounded-xl border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        list ? "flex-row" : "flex-col",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-muted", list ? "aspect-video w-36 sm:w-56" : "aspect-video w-full")}>
        {map.cover_url ? (
          <img
            src={map.cover_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <MapIcon className="size-8" aria-hidden />
          </div>
        )}
        {map.is_editor_pick && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
            <Sparkles className="size-3 text-primary" aria-hidden />
            Đề xuất
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {categoryName && <span className="truncate">{categoryName}</span>}
          {map.map_code && (
            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono normal-case tracking-normal text-foreground">
              {map.map_code}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 font-heading text-[15px] font-bold leading-snug text-foreground group-hover:text-primary">
          {map.title}
        </h3>
        {list && map.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{map.summary}</p>}

        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          {map.creator && (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{map.creator.display_name}</span>
              {map.creator.verification_status === "verified" && <VerifiedBadge className="[&_svg]:size-3.5" />}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1" title="Lượt xem trên ArexNetwork">
              <Eye className="size-3.5" aria-hidden />
              <span className="sr-only">Lượt xem trên web:</span>
              {formatCount(map.view_count)}
            </span>
            <span className="flex items-center gap-1" title="Lượt lưu">
              <Heart className="size-3.5" aria-hidden />
              <span className="sr-only">Lượt lưu:</span>
              {formatCount(map.favorite_count)}
            </span>
            {avg !== null && (
              <span className="flex items-center gap-1" title={`${map.rating_count} đánh giá`}>
                <Star className="size-3.5" aria-hidden />
                <span className="sr-only">Điểm đánh giá:</span>
                {avg.toFixed(1)}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MapGrid({
  maps,
  categories,
  layout = "grid",
  empty,
}: {
  maps: CraftlandMapCard[];
  categories: Array<{ slug: string; name: string }>;
  layout?: "grid" | "list";
  empty?: React.ReactNode;
}) {
  if (maps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
        {empty ?? "Chưa có bản đồ nào."}
      </div>
    );
  }
  const names = new Map(categories.map((c) => [c.slug, c.name]));
  return (
    <div className={layout === "list" ? "flex flex-col gap-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
      {maps.map((m) => (
        <MapCard key={m.id} map={m} categoryName={names.get(m.category_slug)} layout={layout} />
      ))}
    </div>
  );
}

export function MapGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Đang tải bản đồ">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-video animate-pulse bg-muted" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
