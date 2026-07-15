import type { Metadata } from "next";
import { FeatureLocksPanel } from "@/components/admin/feature-locks-panel";

export const metadata: Metadata = {
  title: "Khóa Chức Năng",
  description: "Khóa / đánh dấu đang cập nhật cho từng chức năng — không bảo trì cả web.",
};

export default function AdminFeatureLocksPage() {
  return <FeatureLocksPanel />;
}
