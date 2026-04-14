import type { Metadata } from "next";
import { RatingsAdminPanel } from "../../../components/admin/ratings-admin-panel";

export const metadata: Metadata = { title: "Quản Lý Đánh Giá" };

export default function AdminRatingsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">ĐÁNH GIÁ BÀI VIẾT</h1>
        <p className="text-sm text-muted-foreground">Xem và xóa các đánh giá vi phạm từ người dùng.</p>
      </div>
      <RatingsAdminPanel />
    </section>
  );
}
