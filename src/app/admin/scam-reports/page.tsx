import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { ScamReportsPanel } from "@/components/admin/scam-reports-panel";

export const metadata: Metadata = {
  title: "Hồ Sơ Rủi Ro",
  description: "Quản lý cảnh báo scam cấp cho công cụ Check Scam.",
};
export const dynamic = "force-dynamic";

// Redirect ở layout KHÔNG chặn được request RSC tới thẳng page — mỗi trang admin
// phải tự gọi requireAdminAccess.
export default async function AdminScamReportsPage() {
  await requireAdminAccess();
  return <ScamReportsPanel />;
}
