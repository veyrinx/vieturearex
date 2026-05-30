import type { Metadata } from "next";
import { TitleGrantPanel } from "@/components/admin/title-grant-panel";

export const metadata: Metadata = {
  title: "Cấp Danh Hiệu — Admin",
};

export default function AdminTitlePage() {
  return <TitleGrantPanel />;
}
