import type { Metadata } from "next";
import { CountdownsPanel } from "@/components/admin/countdowns-panel";
import { getCountdowns } from "@/lib/server/countdowns";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Đếm Ngược Sự Kiện",
  description: "Quản lý mốc đếm ngược: cập nhật OB, reset rank, sự kiện Free Fire.",
};

export default async function AdminDemNguocPage() {
  const [auth, items] = await Promise.all([getAuthContext(), getCountdowns()]);
  const canEdit = auth.role === "super_admin";
  return <CountdownsPanel initialItems={items} canEdit={canEdit} />;
}
