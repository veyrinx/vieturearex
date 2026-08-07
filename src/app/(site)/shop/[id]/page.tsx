import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Eye, Star } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { BuyPanel } from "@/components/shop/buy-panel";
import { bumpListingViews, getListing, getShopViewer } from "@/lib/server/shop";
import { LISTING_KIND_LABEL, LISTING_STATUS_LABEL, formatVnd } from "@/lib/constants/shop";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Không tìm thấy tin" };
  return {
    title: `${listing.title} — ${formatVnd(listing.price)}`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `${siteConfig.url}/shop/${listing.id}` },
    openGraph: {
      title: `${listing.title} | Chợ Arex`,
      description: listing.description.slice(0, 160),
      url: `${siteConfig.url}/shop/${listing.id}`,
      images: listing.images[0] ? [listing.images[0]] : undefined,
      type: "website",
      siteName: siteConfig.name,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, viewer] = await Promise.all([getListing(id), getShopViewer()]);
  if (!listing) notFound();

  const isOwn = !!viewer.seller && viewer.seller.id === listing.seller_id;
  const visible = ["active", "reserved", "sold"].includes(listing.status) || isOwn || viewer.isAdmin;
  if (!visible) notFound();

  void bumpListingViews(listing.id);

  const details = Object.entries(listing.details ?? {});

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: listing.title, href: `/shop/${listing.id}` },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Ảnh + mô tả */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {listing.images.map((url, i) => (
              <div
                key={url}
                className={`relative overflow-hidden rounded-2xl border border-border bg-muted ${i === 0 ? "col-span-2 aspect-video" : "aspect-square"}`}
              >
                <Image src={url} alt={listing.title} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" unoptimized />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-foreground">Mô tả</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          </div>

          {details.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-foreground">
                Thông tin chi tiết
              </h2>
              <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1 text-xs">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-semibold text-foreground">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Giá + mua */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {LISTING_KIND_LABEL[listing.kind]}
            </span>
            <h1 className="mt-2 font-heading text-xl font-black leading-tight text-foreground">
              {listing.title}
            </h1>
            <p className="mt-1 font-heading text-3xl font-black text-primary dark:text-amber-400">
              {formatVnd(listing.price)}
            </p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="size-3" /> {listing.views} lượt xem</span>
              <span>{LISTING_STATUS_LABEL[listing.status]}</span>
            </div>

            {listing.seller && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <BadgeCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{listing.seller.display_name}</p>
                  <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{listing.seller.orders_done} đơn thành công</span>
                    {listing.seller.rating != null && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="size-3 fill-current" />
                        {listing.seller.rating} ({listing.seller.rating_count})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <BuyPanel listing={listing} signedIn={!!viewer.userId} isOwnListing={isOwn} />
        </div>
      </div>
    </div>
  );
}
