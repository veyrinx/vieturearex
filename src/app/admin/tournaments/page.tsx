import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { getTmsTournaments } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quản Lý Giải Đấu" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusColor: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  registering: "border-emerald-500/40 text-emerald-400",
  ongoing: "border-amber-500/40 text-amber-400",
  finished: "border-muted-foreground/30 text-muted-foreground",
  cancelled: "border-red-500/30 text-red-400",
};

export default async function AdminTournamentsPage() {
  const tournaments = await getTmsTournaments(true).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] flex items-center gap-2">
            <Trophy className="size-5 text-amber-400" /> Giải Đấu
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{tournaments.length} giải đấu</p>
        </div>
        <Link href="/admin/tournaments/new"
          className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors">
          <Plus className="size-3.5" /> Tạo giải
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          Chưa có giải đấu nào.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Tên", "Mode", "Format", "Status", "Teams", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-3 font-semibold">{t.name}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{MODE_LABELS[t.mode]}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{FORMAT_LABELS[t.format]}</td>
                  <td className="px-3 py-3">
                    <span className={cn("text-[10px] font-bold uppercase border rounded-md px-1.5 py-0.5", statusColor[t.status])}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">max {t.max_teams}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/tournaments/${t.id}`}
                      className="text-xs text-primary hover:underline">Quản lý →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
