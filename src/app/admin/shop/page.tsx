import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { isShopAdminRole } from "@/lib/server/shop";
import { ShopAdminPanel } from "@/components/admin/shop-admin-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Chợ Arex",
  description: "Duyệt người bán, duyệt tin đăng và xử lý tranh chấp của chợ Arex.",
};

export default async function AdminShopPage() {
  const auth = await requireAdminAccess();
  // CSKH chỉ được xem đơn — không duyệt hồ sơ / tin đăng
  return <ShopAdminPanel canReview={isShopAdminRole(auth.role)} />;
}
