import type { Metadata } from "next";
import { WikiAdminPanel } from "@/components/admin/wiki-admin-panel";

export const metadata: Metadata = { title: "Quản Lý Wiki — Admin" };

export default function AdminWikiPage() {
  return <WikiAdminPanel />;
}
