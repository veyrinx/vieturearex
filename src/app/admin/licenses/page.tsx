import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { LicensesPanel } from "@/components/admin/licenses-panel";
import { listLicenses } from "@/lib/server/licenses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giấy Phép Bản Quyền",
  description: "Cấp, theo dõi và thu hồi license key cho đối tác dùng sản phẩm Arex.",
};

export default async function AdminLicensesPage() {
  // Layout cũng gọi requireAdminAccess, nhưng layout và page render SONG SONG —
  // thiếu dòng này thì danh sách giấy phép vẫn kịp chảy ra RSC stream trước khi
  // redirect chặn kịp.
  const auth = await requireAdminAccess();
  const items = await listLicenses();

  return (
    <LicensesPanel
      initialItems={items}
      canDelete={auth.role === "super_admin"}
      canReveal={auth.role === "super_admin"}
    />
  );
}
