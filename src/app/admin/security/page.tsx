import type { Metadata } from "next";
import { SecurityPanel } from "@/components/admin/security-panel";

export const metadata: Metadata = {
  title: "Bảo Mật Hệ Thống",
  description: "Quản lý IP bị chặn và theo dõi hoạt động đáng ngờ.",
};

export default function AdminSecurityPage() {
  return <SecurityPanel />;
}
