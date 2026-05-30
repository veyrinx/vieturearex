import type { Metadata } from "next";
import { BroadcastPanel } from "@/components/admin/broadcast-panel";

export const metadata: Metadata = { title: "Thông Báo Hệ Thống — Admin" };

export default function AdminBroadcastPage() {
  return <BroadcastPanel />;
}
