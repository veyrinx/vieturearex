import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/server/auth";
import { getSettings } from "@/lib/data/content-service";
import { PermissionsMatrix } from "@/components/admin/permissions-matrix";

export const metadata: Metadata = {
  title: "Phân Quyền Hệ Thống",
  description: "Cấu hình quyền hạn cho từng role trong nội bộ thay vì chỉnh qua Supabase.",
};

export default async function AdminPermissionsPage() {
  const session = await requireAdminAccess();
  if (session.role !== "super_admin") {
    redirect("/admin");
  }
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === "permissions.role_capabilities")?.value ?? null;
  const customRolesRaw = settings.find((s) => s.key === "permissions.custom_roles")?.value ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em]">
          Phân quyền
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Chỉ <span className="font-bold text-red-500">Super Admin</span> truy cập được trang này.
        </p>
      </div>
      <PermissionsMatrix initialRaw={raw} initialCustomRolesRaw={customRolesRaw} />
    </div>
  );
}
