import type { Metadata } from "next";
import { PopupManager } from "@/components/admin/popup-manager";

export const metadata: Metadata = { title: "Quản Lý Pop-Up" };

export default function AdminPopupPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
          POP-UP THÔNG BÁO
        </h1>
        <p className="text-sm text-muted-foreground">
          BẬT/TẮT VÀ TÙY CHỈNH NỘI DUNG POP-UP HIỂN THỊ KHI NGƯỜI DÙNG VÀO TRANG CHỦ.
        </p>
      </div>
      <PopupManager />
    </section>
  );
}
