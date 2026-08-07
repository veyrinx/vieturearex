import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Eye, Flame, ShieldCheck, Star } from "lucide-react";
import {
  LISTING_KIND_LABEL,
  LISTING_STATUS_LABEL,
  formatVnd,
  type ListingStatus,
} from "@/lib/constants/shop";
import type { ShopListing } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Partial<Record<ListingStatus, string>> = {
  reserved: "bg-amber-500/90",
  sold: "bg-slate-600/90",
  pending: "bg-slate-500/90",
  rejected: "bg-red-500/90",
  hidden: "bg-slate-500/90",
};

export function ListingCard({ listing }: { listing: ShopListing }) {
  const cover = listing.images[0];
  const seller = listing.seller;
  const dim = listing.status === "sold" || listing.status === "reserved";
  const featured =
    !!listing.featured_until && Date.parse(listing.featured_until) > Date.now();

  return (
    <Link
      href={`/shop/${listing.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={cn(
              "object-cover transition duration-300 group-hover:scale-105",
              dim && "opacity-60 grayscale",
            )}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Chưa có ảnh
          </div>
        )}

        <span className="absolute left-2 top-2 flex items-center gap-1">
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur">
            {LISTING_KIND_LABEL[listing.kind]}
          </span>
          {featured && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
              <Flame className="size-2.5" /> Nổi bật
            </span>
          )}
        </span>
        {listing.status !== "active" && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur",
              STATUS_CHIP[listing.status] ?? "bg-black/60",
            )}
          >
            {LISTING_STATUS_LABEL[listing.status]}
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-sm font-bold leading-tight text-foreground">
          {listing.title}
        </h3>
        <p className="font-heading text-lg font-black text-primary dark:text-amber-400">
          {formatVnd(listing.price)}
          {listing.negotiable && (
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">có thương lượng</span>
          )}
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <BadgeCheck className="size-3 shrink-0 text-emerald-500" />
            <span className="truncate font-semibold text-foreground/80">
              {seller?.display_name ?? "Người bán"}
            </span>
            {seller?.rating != null && (
              <span className="flex shrink-0 items-center gap-0.5 text-amber-500">
                <Star className="size-3 fill-current" />
                {seller.rating}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Eye className="size-3" />
            {listing.views}
          </span>
        </div>

        <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3" /> Có trung gian giữ tiền
        </p>
      </div>
    </Link>
  );
}
