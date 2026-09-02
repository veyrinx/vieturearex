import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { MailBlastPanel } from "@/components/admin/mail-blast-panel";

export const metadata: Metadata = {
  title: "Gửi Email",
  description: "Soạn và gửi email cho nhiều người nhận cùng lúc.",
};
export const dynamic = "force-dynamic";

// Redirect ở layout KHÔNG chặn được request RSC tới thẳng page — mỗi trang admin
// phải tự gọi requireAdminAccess.
export default async function AdminMailPage() {
  await requireAdminAccess();
  return <MailBlastPanel />;
}
