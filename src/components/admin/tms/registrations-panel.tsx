"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TmsRegistration } from "@/lib/tms/types";

const STATUS_COLOR: Record<string, string> = {
  pending: "border-amber-500/40 text-amber-400",
  approved: "border-emerald-500/40 text-emerald-400",
  rejected: "border-red-500/30 text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export function RegistrationsPanel({
  tournamentId,
  initialRegistrations,
}: {
  tournamentId: string;
  initialRegistrations: TmsRegistration[];
}) {
  const router = useRouter();
  const [regs, setRegs] = useState(initialRegistrations);
  const [loading, setLoading] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState<Record<string, string>>({});

  const update = async (regId: string, status: "approved" | "rejected", groupLabel?: string) => {
    setLoading(regId);
    try {
      const res = await fetch(`/api/tms/tournaments/${tournamentId}/registrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_id: regId, status, group_label: groupLabel }),
      });
      if (!res.ok) { toast.error("Lỗi cập nhật đăng ký."); return; }
      setRegs((prev) => prev.map((r) => r.id === regId ? { ...r, status, group_label: groupLabel ?? r.group_label } : r));
      router.refresh();
      toast.success(status === "approved" ? "Đã duyệt." : "Đã từ chối.");
    } finally { setLoading(null); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Users className="size-4" /> Đăng ký ({regs.length})
      </h2>

      {regs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có đội nào đăng ký.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Đội", "Tag", "Đăng ký lúc", "Bảng", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-semibold">{r.team?.name ?? r.team_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">[{r.team?.tag}]</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.registered_at).toLocaleDateString("vi")}</td>
                  <td className="px-3 py-2">
                    <input
                      className="h-7 w-12 rounded border border-border bg-muted px-1 text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      value={groupInput[r.id] ?? r.group_label ?? ""}
                      onChange={(e) => setGroupInput((p) => ({ ...p, [r.id]: e.target.value }))}
                      placeholder="A"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] font-bold uppercase border rounded px-1.5 py-0.5", STATUS_COLOR[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {r.status !== "approved" && (
                        <Button size="sm" variant="outline" disabled={loading === r.id}
                          onClick={() => void update(r.id, "approved", groupInput[r.id] || r.group_label || undefined)}
                          className="h-7 gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                          {loading === r.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button size="sm" variant="outline" disabled={loading === r.id}
                          onClick={() => void update(r.id, "rejected")}
                          className="h-7 gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10">
                          {loading === r.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                        </Button>
                      )}
                    </div>
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
