import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { StatsPageClient } from "@/components/admin/stats-page-client";

export const metadata: Metadata = { title: "Thống kê chi tiết" };

export default async function StatsPage() {
  await requireAdminAccess();
  return <StatsPageClient />;
}
