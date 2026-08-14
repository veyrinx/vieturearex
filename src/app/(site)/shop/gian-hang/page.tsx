import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Store } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ShopProfileForm } from "@/components/shop/shop-profile-form";
import { ShopSalePanel } from "@/components/shop/shop-sale-panel";
import { getShopViewer, listListings, pickShop } from "@/lib/server/shop";
import { isSaleLive } from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gian hàng của tôi — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/gian-hang` },
  robots: { index: false },
};

/**
 * Trang quản lý gian hàng: sửa thông tin shop + chạy đợt giảm giá.
 *
 * Chủ shop thấy cả hai phần. CTV chỉ thấy phần giảm giá — họ phụ bán hàng chứ
 * không đứng tên giấy tờ và tài khoản ngân hàng của gian hàng, nên hồ sơ không
 * được gửi xuống trình duyệt của họ.
 */
export default async function ShopSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const [{ shop: wantedShop }, viewer] = await Promise.all([searchParams, getShopViewer()]);
  if (!viewer.userId) redirect("/login?next=/shop/gian-hang");

  const manageable = viewer.shops.filter((s) => s.canManageListings);
  if (manageable.length === 0) redirect("/shop/dang-ky-ban");
  const active = pickShop(manageable, wantedShop)!;

  const listings = await listListings({
    sellerId: active.seller.id,
    status: "active",
    limit: 200,
  });
  const onSaleCount = listings.filter(isSaleLive).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Gian hàng của tôi", href: "/shop/gian-hang" },
        ]}
      />
      <PageHero
        icon={Store}
        eyebrow={active.isOwner ? "Người bán" : "CTV gian hàng"}
        title={active.isOwner ? "Gian hàng của tôi" : active.seller.display_name}
        subtitle={`${listings.length} tin đang bán · ${active.seller.orders_done} đơn thành công`}
      />

      {/* Chọn gian hàng — chỉ hiện khi người này làm việc cho nhiều shop. */}
      {manageable.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {manageable.map((s) => (
            <Link
              key={s.seller.id}
              href={`/shop/gian-hang?shop=${s.seller.id}`}
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

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/shop/tin-cua-toi?shop=${active.seller.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/30 hover:text-primary"
        >
          <ClipboardList className="size-3.5" /> Tin của gian hàng
        </Link>
        {active.seller.status === "approved" && (
          <Link
            href={`/shop/nguoi-ban/${active.seller.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/30 hover:text-primary"
          >
            <Store className="size-3.5" /> Xem trang công khai
          </Link>
        )}
      </div>

      <ShopSalePanel
        sellerId={active.seller.id}
        activeCount={listings.length}
        onSaleCount={onSaleCount}
        samplePrice={listings[0]?.price ?? null}
      />

      {active.isOwner ? (
        <ShopProfileForm seller={active.seller} />
      ) : (
        <p className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Bạn đang phụ gian hàng này với vai CTV, nên chỉ chạy được đợt giảm giá. Thông tin gian
          hàng do chủ shop tự sửa.
        </p>
      )}
    </div>
  );
}
