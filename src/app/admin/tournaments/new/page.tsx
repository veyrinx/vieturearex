import type { Metadata } from "next";
import { TournamentForm } from "@/components/admin/tms/tournament-form";

export const metadata: Metadata = { title: "Tạo Giải Đấu" };

export default function NewTournamentPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em]">Tạo Giải Đấu Mới</h1>
      <TournamentForm />
    </div>
  );
}
