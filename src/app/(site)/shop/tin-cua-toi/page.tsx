import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingCard } from "@/components/shop/listing-card";
import { getShopViewer, listListings } from "@/lib/server/shop";
import { LISTING_STATUS_LABEL } from "@/lib/constants/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tin của tôi — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/tin-cua-toi` },
  robots: { index: false },
};

export default async function MyListingsPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/tin-cua-toi");
  if (!viewer.seller) redirect("/shop/dang-ky-ban");

  const listings = await listListings({
    sellerId: viewer.seller.id,
    status: ["pending", "active", "reserved", "sold", "rejected", "hidden"],
    limit: 100,
  });

  const counts = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Tin của tôi", href: "/shop/tin-cua-toi" },
        ]}
      />
      <PageHero
        icon={Store}
        eyebrow="Người bán"
        title="Tin của tôi"
        subtitle={`${listings.length} tin · ${viewer.seller.orders_done} đơn thành công`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(counts).map(([status, n]) => (
          <span key={status} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {LISTING_STATUS_LABEL[status as keyof typeof LISTING_STATUS_LABEL]}: {n}
          </span>
        ))}
        <Link
          href="/shop/dang-tin"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
        >
          <Plus className="size-3.5" /> Đăng tin mới
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          Bạn chưa đăng tin nào.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <div key={l.id} className="space-y-1">
              <ListingCard listing={l} />
              {l.status === "rejected" && l.reject_reason && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-2 py-1 text-[10px] text-red-500">
                  Bị từ chối: {l.reject_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
