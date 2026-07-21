import type { Metadata } from "next";
import { SocialPanel } from "@/components/admin/social-panel";
import { getSocialVideos } from "@/lib/server/social";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Mạng Xã Hội",
  description: "Quản lý nội dung nhúng từ TikTok, YouTube và các kênh mạng xã hội.",
};

export default async function AdminSocialPage() {
  const [auth, items] = await Promise.all([getAuthContext(), getSocialVideos()]);
  const canEdit = auth.role === "super_admin";
  return <SocialPanel initialItems={items} canEdit={canEdit} />;
}
