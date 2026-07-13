import type { Metadata } from "next";
import { WeaponsManager } from "@/components/admin/weapons-manager";

export const metadata: Metadata = { title: "Quản Lý Vũ Khí" };

export default function AdminWeaponsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
          VŨ KHÍ
        </h1>
        <p className="text-sm text-muted-foreground">
          THÊM VÀ CHỈNH SỬA THÔNG TIN CHI TIẾT VŨ KHÍ (CHỈ SỐ, ẢNH) HIỂN THỊ Ở TRANG /VU-KHI.
        </p>
      </div>
      <WeaponsManager />
    </section>
  );
}
