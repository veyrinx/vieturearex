import type { Metadata } from "next";
import { GalleryManager } from "@/components/admin/gallery-manager";

export const metadata: Metadata = {
  title: "Quản Lý Thư Viện",
  description: "Quản trị hình ảnh thư viện cộng đồng.",
};

export default function AdminGalleryPage() {
  return <GalleryManager />;
}
