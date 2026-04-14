import type { Metadata } from "next";
import { EventsAdminPanel } from "@/components/admin/events-admin-panel";

export const metadata: Metadata = {
  title: "Quản Lý Sự Kiện",
  description: "Quản trị sự kiện và mốc thời gian theo múi giờ Việt Nam.",
};

export default function AdminEventsPage() {
  return <EventsAdminPanel />;
}
