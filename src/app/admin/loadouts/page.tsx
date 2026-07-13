import type { Metadata } from "next";
import { LoadoutsManager } from "@/components/admin/loadouts-manager";

export const metadata: Metadata = { title: "Quản Lý Combo Vũ Khí" };

export default function AdminLoadoutsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
          COMBO VŨ KHÍ
        </h1>
        <p className="text-sm text-muted-foreground">
          TẠO CÁC BỘ COMBO/LOADOUT (VŨ KHÍ CHÍNH + PHỤ) THEO LỐI CHƠI, HIỂN THỊ Ở TRANG /VU-KHI/LOADOUT.
        </p>
      </div>
      <LoadoutsManager />
    </section>
  );
}
