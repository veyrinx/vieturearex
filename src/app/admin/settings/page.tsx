import type { Metadata } from "next";
import { SettingsAdminPanel } from "@/components/admin/settings-admin-panel";

export const metadata: Metadata = {
  title: "Cài Đặt",
  description: "Quản trị SEO, giao diện trang chủ và cấu hình hệ thống.",
};

export default function AdminSettingsPage() {
  return <SettingsAdminPanel />;
}
