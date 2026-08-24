import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { OpsPanel } from "@/components/admin/ops-panel";

export const metadata: Metadata = {
  title: "Vận Hành",
  description: "Sức khoẻ việc định kỳ (cron) và quota API Free Fire.",
};
export const dynamic = "force-dynamic";

// Redirect ở layout KHÔNG chặn được request RSC tới thẳng page — mỗi trang admin
// phải tự gọi requireAdminAccess.
export default async function AdminOpsPage() {
  await requireAdminAccess();
  return <OpsPanel />;
}
