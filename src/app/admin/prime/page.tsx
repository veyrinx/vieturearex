import type { Metadata } from "next";
import { PrimePanel } from "@/components/admin/prime-panel";
import { getPrimeItems } from "@/lib/server/store";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Cửa Hàng Prime",
  description: "Quản lý gói thành viên Prime, ưu đãi và quyền lợi.",
};

export default async function AdminPrimePage() {
  const [auth, items] = await Promise.all([getAuthContext(), getPrimeItems()]);
  const canEdit = auth.role === "super_admin";
  return <PrimePanel initialItems={items} canEdit={canEdit} />;
}
