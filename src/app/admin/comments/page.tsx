import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { CommentsAdminPanel } from "@/components/admin/comments-admin-panel";

export const metadata: Metadata = { title: "Bình Luận" };

export default function AdminCommentsPage() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10">
          <MessageSquare className="size-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-foreground">
            Bình luận
          </h1>
          <p className="text-xs text-muted-foreground">Duyệt, từ chối hoặc xóa bình luận của người dùng</p>
        </div>
      </div>
      <CommentsAdminPanel />
    </section>
  );
}
