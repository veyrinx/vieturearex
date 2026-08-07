import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingForm } from "@/components/shop/listing-form";
import { getShopViewer } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng tin bán — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/dang-tin` },
  robots: { index: false },
};

export default async function CreateListingPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/dang-tin");
  if (viewer.seller?.status !== "approved") redirect("/shop/dang-ky-ban");

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
        eyebrow="Người bán"
        title="Đăng tin bán"
        subtitle="Tin sẽ lên chợ sau khi admin duyệt nội dung và ảnh."
      />
      <ListingForm />
    </div>
  );
}
