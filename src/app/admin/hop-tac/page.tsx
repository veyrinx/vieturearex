import type { Metadata } from "next";
import { PartnersPanel } from "@/components/admin/partners-panel";
import { getPartners } from "@/lib/server/partners";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Hợp Tác",
  description: "Quản lý nhà tài trợ, đối tác truyền thông và cộng đồng đồng hành.",
};

export default async function AdminHopTacPage() {
  const [auth, items] = await Promise.all([getAuthContext(), getPartners()]);
  const canEdit = auth.role === "super_admin";
  return <PartnersPanel initialItems={items} canEdit={canEdit} />;
}
