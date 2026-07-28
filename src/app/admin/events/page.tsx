import type { Metadata } from "next";
import { EventsAdminPanel } from "@/components/admin/events-admin-panel";
import { requireAdminAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Sự Kiện",
  description: "Quản trị sự kiện và mốc thời gian theo múi giờ Việt Nam.",
};

export default async function AdminEventsPage() {
  await requireAdminAccess();
  return <EventsAdminPanel />;
}
