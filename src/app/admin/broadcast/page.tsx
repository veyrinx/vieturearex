import type { Metadata } from "next";
import { BroadcastPanel } from "@/components/admin/broadcast-panel";
import { PushSendPanel } from "@/components/admin/push-send-panel";

export const metadata: Metadata = { title: "Thông Báo Hệ Thống — Admin" };

export default function AdminBroadcastPage() {
  return (
    <div className="space-y-5">
      <PushSendPanel />
      <BroadcastPanel />
    </div>
  );
}
