import type { Metadata } from "next";
import { NewsAdminPanel } from "@/components/admin/news-admin-panel";

export const metadata: Metadata = {
  title: "Quản Lý Tin Tức",
  description: "Quản trị bài viết tin tức với trình soạn thảo, ngày đăng và trạng thái.",
};

export default function AdminNewsPage() {
  return <NewsAdminPanel />;
}
