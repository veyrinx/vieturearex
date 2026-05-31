import type { Metadata } from "next";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export const metadata: Metadata = {
  title: "Thông Báo — Arex",
  description: "Xem tất cả thông báo của bạn.",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl py-8 md:py-12 space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex</p>
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
          Thông Báo
        </h1>
        <p className="text-sm text-muted-foreground">Tất cả hoạt động liên quan đến tài khoản của bạn</p>
      </div>
      <NotificationsClient />
    </div>
  );
}
