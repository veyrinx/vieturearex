import type { Metadata } from "next";
import { ActivityLogsPanel } from "@/components/admin/activity-logs-panel";

export const metadata: Metadata = {
  title: "Nhật Ký Hoạt Động",
  description: "Theo dõi nhật ký hoạt động của trang quản trị trong 48 giờ gần nhất.",
};

export default function AdminLogsPage() {
  return <ActivityLogsPanel />;
}
