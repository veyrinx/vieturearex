import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export const metadata: Metadata = {
  title: "Thông Báo",
  description: "Xem tất cả thông báo của bạn.",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl py-8 md:py-12 space-y-6">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-transparent dark:from-amber-400/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <Bell className="size-6 text-primary dark:text-amber-400" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Thông Báo
            </h1>
            <p className="text-sm text-muted-foreground">Tất cả hoạt động liên quan đến tài khoản của bạn</p>
          </div>
        </div>
      </div>
      <NotificationsClient />
    </div>
  );
}
