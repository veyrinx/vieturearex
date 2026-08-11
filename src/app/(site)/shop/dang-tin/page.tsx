import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingForm } from "@/components/shop/listing-form";
import { getShopViewer, pickShop } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng tin bán — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/dang-tin` },
  robots: { index: false },
};

export default async function CreateListingPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const [{ shop: wantedShop }, viewer] = await Promise.all([searchParams, getShopViewer()]);
  if (!viewer.userId) redirect("/login?next=/shop/dang-tin");

  // Đăng được cho gian hàng của mình, hoặc gian hàng đã mời mình làm CTV quản
  // lý tin. Cả hai đều phải là gian hàng đã được duyệt.
  const usable = viewer.shops.filter(
    (s) => s.canManageListings && s.seller.status === "approved",
  );
  const active = pickShop(usable, wantedShop);
  if (!active) redirect("/shop/dang-ky-ban");

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Đăng tin", href: "/shop/dang-tin" },
        ]}
      />
      <PageHero
        icon={PackagePlus}
        eyebrow={active.isOwner ? "Người bán" : "CTV gian hàng"}
        title="Đăng tin bán"
        subtitle={
          active.isOwner
            ? "Tin sẽ lên chợ sau khi admin duyệt nội dung và ảnh."
            : `Đăng cho gian hàng ${active.seller.display_name} — tin vẫn qua admin duyệt.`
        }
      />
      <ListingForm
        sellerId={active.seller.id}
        shopName={active.isOwner ? null : active.seller.display_name}
      />
    </div>
  );
}
