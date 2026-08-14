import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server/auth";
import { FailoverPanel } from "@/components/admin/failover-panel";

export const metadata: Metadata = {
  title: "Chuyển hướng nhanh",
  description: "Đẩy khách sang máy chủ dự phòng ngay khi máy chính có sự cố.",
};

export default async function FailoverPage() {
  const auth = await getAuthContext();

  // Tự kiểm quyền ngay trong page: redirect ở layout không chặn được request RSC
  // của chính trang này.
  if (auth.role !== "super_admin") {
    redirect("/admin");
  }

  return <FailoverPanel />;
}
