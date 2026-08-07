import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { OrderDetail } from "@/components/shop/order-detail";
import { getAuthContext } from "@/lib/server/auth";
import {
  getDisputeForOrder,
  getOrderByCode,
  getReviewForOrder,
  listOrderEvents,
  partyForOrder,
} from "@/lib/server/shop";
import { redactOrder, redactOrderEvents } from "@/lib/server/shop-privacy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết đơn — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/don-hang` },
  robots: { index: false },
};

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) redirect(`/login?next=/shop/don-hang/${code}`);

  const order = await getOrderByCode(code);
  if (!order) notFound();

  const party = await partyForOrder(order, auth.userId, auth.role);
  if (!party) notFound();

  const [rawEvents, dispute, review] = await Promise.all([
    listOrderEvents(order.id),
    getDisputeForOrder(order.id),
    getReviewForOrder(order.id),
  ]);

  // Cùng lớp che với API — HTML kết xuất sẵn cũng không được mang dư dữ liệu.
  const viewer = { userId: auth.userId, party };
  const safeOrder = redactOrder(order, viewer);
  const events = redactOrderEvents(rawEvents, order, viewer);

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Đơn hàng", href: "/shop/don-hang" },
          { name: order.code, href: `/shop/don-hang/${order.code}` },
        ]}
      />
      <PageHero
        icon={ReceiptText}
        eyebrow={`Đơn ${order.code}`}
        title="Chi tiết giao dịch"
        subtitle="Mỗi bước đều được ghi lại kèm ảnh — giữ nguyên làm bằng chứng."
      />
      <OrderDetail initial={{ order: safeOrder, events, dispute, review, party }} />
    </div>
  );
}
