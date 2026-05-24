import type { Metadata } from "next";
import { BarChart2 } from "lucide-react";
import { PollsAdminPanel } from "@/components/admin/polls-admin-panel";

export const metadata: Metadata = { title: "Bình Chọn (Poll)" };

export default function AdminPollsPage() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
          <BarChart2 className="size-5 text-violet-500" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-foreground">
            Bình Chọn
          </h1>
          <p className="text-xs text-muted-foreground">Tạo và quản lý poll cho sự kiện, tin tức</p>
        </div>
      </div>
      <PollsAdminPanel />
    </section>
  );
}
