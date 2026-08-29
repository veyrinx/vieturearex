import type { Metadata } from "next";
import { WishlistAdminPanel } from "@/components/admin/wishlist-admin-panel";
import { requireAdminCapability } from "@/lib/server/admin-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh Sách Mong Muốn",
  description: "Gắn wishlist Free Fire hộ người chơi — hệ thống tự đăng nhập bằng .dat hoặc UID khách.",
};

export default async function AdminWishlistPage() {
  // Middleware đã chặn vai không được cấp, nhưng phải hỏi lại ngay trong page:
  // layout và page render SONG SONG, chuyển hướng ở layout không kịp giữ nội
  // dung của page lại trong RSC stream.
  const access = await requireAdminCapability("wishlist.view");

  return (
    <WishlistAdminPanel
      canLogin={access.can("wishlist.credentials")}
      canManage={access.can("wishlist.manage")}
    />
  );
}
