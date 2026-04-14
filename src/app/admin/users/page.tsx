import type { Metadata } from "next";
import { UsersAdminPanel } from "@/components/admin/users-admin-panel";

export const metadata: Metadata = {
  title: "Quản Lý Người Dùng",
  description: "Quản trị quyền người dùng, danh sách mời và hoạt động quản trị viên.",
};

export default function AdminUsersPage() {
  return <UsersAdminPanel />;
}
