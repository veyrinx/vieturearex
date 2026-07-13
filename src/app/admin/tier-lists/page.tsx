import type { Metadata } from "next";
import { TierListManager } from "@/components/admin/tier-list-manager";

export const metadata: Metadata = { title: "Quản Lý Tier List" };

export default function AdminTierListsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
          TIER LIST
        </h1>
        <p className="text-sm text-muted-foreground">
          TẠO VÀ QUẢN LÝ BẢNG XẾP HẠNG NHÂN VẬT / VŨ KHÍ THEO PHIÊN BẢN OB HIỂN THỊ CHO CỘNG ĐỒNG.
        </p>
      </div>
      <TierListManager />
    </section>
  );
}
