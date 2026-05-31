import type { Metadata } from "next";
import { AchievementsAdminPanel } from "@/components/admin/achievements-admin-panel";

export const metadata: Metadata = { title: "Quản Lý Thành Tựu — Admin" };

export default function AdminAchievementsPage() {
  return <AchievementsAdminPanel />;
}
