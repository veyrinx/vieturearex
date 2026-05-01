"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords, Plus, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MATCH_STATUS_LABELS } from "@/lib/tms/types";
import type { TmsMatch, TmsTeam } from "@/lib/tms/types";
import { ResultEntryDialog } from "./result-entry-dialog";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-foreground",
  playing: "text-amber-400",
  done: "text-emerald-400",
  cancelled: "text-red-400",
};

type Props = {
  tournamentId: string;
  initialMatches: TmsMatch[];
  approvedTeams: TmsTeam[];
};

const FIELD = "h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const LABEL = "text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block";

export function MatchesPanel({ tournamentId, initialMatches, approvedTeams }: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState(initialMatches);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultMatch, setResultMatch] = useState<TmsMatch | null>(null);

  const [form, setForm] = useState({
    round: "Vòng bảng",
    round_num: 1,
    team_a_id: "",
    team_b_id: "",
    scheduled_at: "",
  });

  const createMatch = async () => {
    if (!form.team_a_id || !form.team_b_id) { toast.error("Chọn đủ 2 đội."); return; }
    if (form.team_a_id === form.team_b_id) { toast.error("2 đội phải khác nhau."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tms/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          ...form,
          round_num: Number(form.round_num),
          scheduled_at: form.scheduled_at || null,
        }),
      });
      if (!res.ok) { toast.error("Lỗi tạo trận."); return; }
      const match = (await res.json()) as TmsMatch;
      // enrich with team names
      const teamA = approvedTeams.find((t) => t.id === form.team_a_id);
      const teamB = approvedTeams.find((t) => t.id === form.team_b_id);
      setMatches((p) => [...p, { ...match, team_a: teamA, team_b: teamB }]);
      setShowForm(false);
      setForm({ round: "Vòng bảng", round_num: 1, team_a_id: "", team_b_id: "", scheduled_at: "" });
      toast.success("Đã tạo trận.");
      router.refresh();
    } finally { setSaving(false); }
  };

  const onResultSaved = (matchId: string) => {
    setMatches((p) => p.map((m) => m.id === matchId ? { ...m, status: "done" } : m));
    setResultMatch(null);
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Swords className="size-4" /> Trận đấu ({matches.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowForm((p) => !p)} className="gap-1.5 text-xs">
          <Plus className="size-3" /> Tạo trận
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Vòng đấu</label>
              <input className={FIELD} value={form.round} onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} placeholder="Vòng bảng A" />
            </div>
            <div>
              <label className={LABEL}>Số thứ tự</label>
              <input type="number" min={1} className={FIELD} value={form.round_num} onChange={(e) => setForm((p) => ({ ...p, round_num: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={LABEL}>Đội A</label>
              <select className={FIELD} value={form.team_a_id} onChange={(e) => setForm((p) => ({ ...p, team_a_id: e.target.value }))}>
                <option value="">— chọn đội —</option>
                {approvedTeams.map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Đội B</label>
              <select className={FIELD} value={form.team_b_id} onChange={(e) => setForm((p) => ({ ...p, team_b_id: e.target.value }))}>
                <option value="">— chọn đội —</option>
                {approvedTeams.filter((t) => t.id !== form.team_a_id).map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Giờ thi đấu</label>
              <input type="datetime-local" className={FIELD} value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Huỷ</Button>
            <Button size="sm" onClick={() => void createMatch()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Tạo trận
            </Button>
          </div>
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có trận nào.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Vòng", "Trận", "Giờ", "Status", "Thắng", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-t border-border/60 hover:bg-muted/10">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.round}</td>
                  <td className="px-3 py-2 font-semibold">
                    {m.team_a?.name ?? "?"} <span className="text-muted-foreground mx-1">vs</span> {m.team_b?.name ?? "?"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString("vi") : "—"}
                  </td>
                  <td className={cn("px-3 py-2 text-xs font-semibold", STATUS_COLOR[m.status])}>
                    {MATCH_STATUS_LABELS[m.status]}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-amber-400">
                    {m.winner_id
                      ? (m.winner_id === m.team_a_id ? m.team_a?.name : m.team_b?.name) ?? "—"
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {m.status !== "done" && (
                      <Button size="sm" variant="outline"
                        onClick={() => setResultMatch(m)}
                        className="h-7 gap-1 text-xs">
                        <ClipboardList className="size-3" /> Nhập KQ
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultMatch && (
        <ResultEntryDialog
          match={resultMatch}
          approvedTeams={approvedTeams}
          onClose={() => setResultMatch(null)}
          onSaved={onResultSaved}
        />
      )}
    </div>
  );
}
