import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { BumpButton } from "@/components/shop/bump-button";
import { FeatureRequestButton } from "@/components/shop/feature-request-button";
import { ListingCard } from "@/components/shop/listing-card";
import { getShopViewer, listListings, pickShop } from "@/lib/server/shop";
import { LISTING_STATUS_LABEL } from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tin của tôi — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/tin-cua-toi` },
  robots: { index: false },
};

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const [{ shop: wantedShop }, viewer] = await Promise.all([searchParams, getShopViewer()]);
  if (!viewer.userId) redirect("/login?next=/shop/tin-cua-toi");

  // CTV được bật quyền quản lý tin cũng vào đây, nhưng chỉ thấy tin của những
  // gian hàng đã mời họ.
  const manageable = viewer.shops.filter((s) => s.canManageListings);
  if (manageable.length === 0) redirect("/shop/dang-ky-ban");
  const active = pickShop(manageable, wantedShop)!;

  const listings = await listListings({
    sellerId: active.seller.id,
    status: ["pending", "active", "reserved", "sold", "rejected", "hidden"],
    limit: 100,
  });

  const counts = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const createHref = active.isOwner
    ? "/shop/dang-tin"
    : `/shop/dang-tin?shop=${active.seller.id}`;

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
        eyebrow={active.isOwner ? "Người bán" : "CTV gian hàng"}
        title={active.isOwner ? "Tin của tôi" : `Tin của ${active.seller.display_name}`}
        subtitle={`${listings.length} tin · ${active.seller.orders_done} đơn thành công`}
      />

      {/* Chọn gian hàng — chỉ hiện khi người này làm việc cho nhiều shop. */}
      {manageable.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {manageable.map((s) => (
            <Link
              key={s.seller.id}
              href={`/shop/tin-cua-toi?shop=${s.seller.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-bold transition",
                s.seller.id === active.seller.id
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
              )}
            >
              {s.isOwner ? `${s.seller.display_name} (của tôi)` : s.seller.display_name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(counts).map(([status, n]) => (
          <span key={status} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {LISTING_STATUS_LABEL[status as keyof typeof LISTING_STATUS_LABEL]}: {n}
          </span>
        ))}
        <Link
          href={createHref}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
        >
          <Plus className="size-3.5" /> Đăng tin mới
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          {active.isOwner ? "Bạn chưa đăng tin nào." : "Gian hàng này chưa có tin nào."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <div key={l.id} className="space-y-1">
              <ListingCard listing={l} />
              {l.status === "active" && (
                <>
                  <BumpButton id={l.id} bumpedAt={l.bumped_at} />
                  <FeatureRequestButton
                    id={l.id}
                    featuredUntil={l.featured_until}
                    requestedAt={l.featured_requested_at}
                  />
                </>
              )}
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
