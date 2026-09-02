import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { SocialLoginPanel } from "@/components/admin/social-login-panel";

export const metadata: Metadata = {
  title: "Đăng Nhập Mạng Xã Hội",
  description: "Bật đăng nhập Google, Facebook, Discord và chọn nút hiện ở trang đăng nhập.",
};
export const dynamic = "force-dynamic";

// Redirect ở layout KHÔNG chặn được request RSC tới thẳng page — mỗi trang admin
// phải tự gọi requireAdminAccess.
export default async function AdminSocialLoginPage() {
  await requireAdminAccess();
  return <SocialLoginPanel />;
}
