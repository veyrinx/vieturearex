import type { Metadata } from "next";
import { StreamsAdminPanel } from "@/components/admin/streams-admin-panel";

export const metadata: Metadata = {
  title: "Quản Lý ESPORTS",
  description: "Quản lý các buổi phát trực tiếp và stream ESPORTS.",
};

export default function AdminEsportsPage() {
  return <StreamsAdminPanel />;
}
