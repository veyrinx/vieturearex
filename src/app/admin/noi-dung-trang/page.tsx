import type { Metadata } from "next";
import { PageContentPanel } from "@/components/admin/page-content-panel";
import { getPageContents } from "@/lib/server/page-content";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Nội Dung Trang",
  description: "Sửa nội dung các trang tĩnh: giới thiệu, hướng dẫn và văn bản pháp lý.",
};

export default async function AdminNoiDungTrangPage() {
  const [auth, items] = await Promise.all([getAuthContext(), getPageContents()]);
  const canEdit = auth.role === "super_admin";
  return <PageContentPanel initialItems={items} canEdit={canEdit} />;
}
