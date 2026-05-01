"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Check, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TmsScoreSubmission } from "@/lib/tms/types";

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

export function SubmissionsPanel({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [subs, setSubs] = useState<TmsScoreSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  useEffect(() => {
    fetch(`/api/tms/submissions?tournament_id=${tournamentId}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TmsScoreSubmission[]) => setSubs(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const review = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    try {
      const res = await fetch(`/api/tms/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Lỗi cập nhật."); return; }
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      router.refresh();
      toast.success(status === "approved" ? "Đã duyệt." : "Đã từ chối.");
    } finally {
      setActing(null);
    }
  };

  const displayed = filter === "pending" ? subs.filter((s) => s.status === "pending") : subs;
  const pendingCount = subs.filter((s) => s.status === "pending").length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ClipboardList className="size-4" /> Kết quả nộp ({subs.length})
          {pendingCount > 0 && (
            <span className="rounded border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              {pendingCount} chờ duyệt
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors",
                filter === f
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "pending" ? "Chờ duyệt" : "Tất cả"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Không có kết quả nào.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Player", "FF ID", "Trận", "K/A/D", "Proof", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => (
                <tr key={s.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">
                    {s.user?.display_name ?? s.user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.ff_id}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {s.match?.round ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    <span className="text-emerald-400">{s.kills}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-400">{s.assists}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-400">{s.deaths}</span>
                  </td>
                  <td className="px-3 py-2">
                    {s.proof_url ? (
                      <a href={s.proof_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline dark:text-amber-400">
                        <ExternalLink className="size-3" /> Xem
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] font-bold uppercase border rounded px-1.5 py-0.5", STATUS_COLOR[s.status])}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {s.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={acting === s.id}
                          onClick={() => void review(s.id, "approved")}
                          className="h-7 gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                          {acting === s.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        </Button>
                        <Button size="sm" variant="outline" disabled={acting === s.id}
                          onClick={() => void review(s.id, "rejected")}
                          className="h-7 gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10">
                          {acting === s.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                        </Button>
                      </div>
                    )}
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
