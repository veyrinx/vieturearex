import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { OrderList } from "@/components/shop/order-list";
import { getShopViewer } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đơn hàng của tôi — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/don-hang` },
  robots: { index: false },
};

export default async function MyOrdersPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/don-hang");

  const scopes: { key: "buying" | "selling" | "agent"; label: string }[] = [
    { key: "buying", label: "Tôi mua" },
  ];
  // CTV được bật quyền xử lý đơn cũng có tab này — đơn của gian hàng họ phụ.
  const sellSide = viewer.shops.filter((s) => s.isOwner || s.canHandleOrders);
  if (sellSide.length > 0) {
    scopes.push({ key: "selling", label: sellSide.some((s) => s.isOwner) ? "Tôi bán" : "Shop tôi phụ" });
  }
  if (viewer.isAgent) scopes.push({ key: "agent", label: "Trung gian" });

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Đơn hàng", href: "/shop/don-hang" },
        ]}
      />
      <PageHero
        icon={ReceiptText}
        eyebrow="Giao dịch"
        title="Đơn hàng của tôi"
        subtitle="Theo dõi tiến độ, gửi ảnh bằng chứng và xác nhận từng bước."
      />
      <OrderList scopes={scopes} initialScope="buying" />
    </div>
  );
}
