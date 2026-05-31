import type { Metadata } from "next";
import { ForumAdminPanel } from "@/components/admin/forum-admin-panel";

export const metadata: Metadata = { title: "Kiểm Duyệt Diễn Đàn — Admin" };

export default function AdminForumPage() {
  return <ForumAdminPanel />;
}
