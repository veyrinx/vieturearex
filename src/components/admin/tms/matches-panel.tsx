"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Swords, Plus, Loader2, ClipboardList, Zap, ChevronDown, ChevronRight,
  Trophy, Target, Calendar, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MATCH_STATUS_LABELS } from "@/lib/tms/types";
import type { TmsMatch, TmsTeam, TmsMatchResult } from "@/lib/tms/types";
import { ResultEntryDialog } from "./result-entry-dialog";

const STATUS_COLOR: Record<string, string> = {
  pending:   "text-muted-foreground",
  playing:   "text-amber-400",
  done:      "text-emerald-400",
  cancelled: "text-red-400",
};

type Props = {
  tournamentId: string;
  initialMatches: TmsMatch[];
  approvedTeams: TmsTeam[];
};

const FIELD = "h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const LABEL = "text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block";

// ── Inline schedule editor ────────────────────────────────────────────────────

function ScheduleCell({ match, onUpdated }: { match: TmsMatch; onUpdated: (m: TmsMatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    match.scheduled_at ? match.scheduled_at.slice(0, 16) : "",
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tms/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: value || null }),
      });
      if (!res.ok) { toast.error("Lỗi cập nhật lịch."); return; }
      const updated = (await res.json()) as TmsMatch;
      onUpdated(updated);
      setEditing(false);
      toast.success("Đã lên lịch.");
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 rounded-lg border border-primary/40 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-44"
            autoFocus
          />
          <button onClick={() => void save()} disabled={saving}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-3" />
          </button>
        </div>
      </td>
    );
  }

  return (
    <td
      className="px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground group"
      onClick={() => setEditing(true)}
      title="Nhấn để đặt lịch"
    >
      <span className="flex items-center gap-1">
        {match.scheduled_at
          ? new Date(match.scheduled_at).toLocaleString("vi")
          : <span className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity"><Calendar className="size-3" />Đặt lịch</span>
        }
      </span>
    </td>
  );
}

// ── Match results expandable row ──────────────────────────────────────────────

function MatchResultsRow({ match, onUpdated }: { match: TmsMatch; onUpdated: (m: TmsMatch) => void }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TmsMatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && results === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/tms/matches/${match.id}/results`);
        const data = (await res.json()) as TmsMatchResult[];
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }
    setOpen((p) => !p);
  };

  const teamA = results?.filter((r) => r.team_id === match.team_a_id) ?? [];
  const teamB = results?.filter((r) => r.team_id === match.team_b_id) ?? [];

  return (
    <>
      <tr className="border-t border-border/60 hover:bg-muted/10 cursor-pointer" onClick={() => void toggle()}>
        <td className="px-3 py-2 text-xs text-muted-foreground">{match.round}</td>
        <td className="px-3 py-2 font-semibold text-sm">
          <span className={match.winner_id === match.team_a_id ? "text-emerald-400" : ""}>{match.team_a?.name ?? "?"}</span>
          <span className="text-muted-foreground mx-1.5 font-normal">vs</span>
          <span className={match.winner_id === match.team_b_id ? "text-emerald-400" : ""}>{match.team_b?.name ?? "?"}</span>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString("vi") : "—"}
        </td>
        <td className={cn("px-3 py-2 text-xs font-semibold", STATUS_COLOR[match.status])}>
          {MATCH_STATUS_LABELS[match.status]}
        </td>
        <td className="px-3 py-2 text-xs font-bold text-amber-400">
          {match.winner_id
            ? (match.winner_id === match.team_a_id ? match.team_a?.name : match.team_b?.name) ?? "—"
            : "—"}
        </td>
        <td className="px-3 py-2 text-muted-foreground text-right">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border/60 bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Đang tải kết quả...
              </div>
            ) : results && results.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { label: match.team_a?.name ?? "Đội A", players: teamA, isWinner: match.winner_id === match.team_a_id },
                  { label: match.team_b?.name ?? "Đội B", players: teamB, isWinner: match.winner_id === match.team_b_id },
                ] as const).map(({ label, players, isWinner }) => (
                  <div key={label} className="rounded-xl border border-border overflow-hidden">
                    <div className={cn("px-3 py-1.5 text-xs font-bold flex items-center gap-1.5",
                      isWinner ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground")}>
                      {isWinner && <Trophy className="size-3" />}{label}
                      {isWinner && <span className="ml-auto text-[10px]">THẮNG</span>}
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                          <th className="px-2 py-1 text-left">Tuyển thủ</th>
                          <th className="px-2 py-1 text-right">K</th>
                          <th className="px-2 py-1 text-right">A</th>
                          <th className="px-2 py-1 text-right">D</th>
                          <th className="px-2 py-1 text-right"><Target className="size-2.5 inline" /></th>
                          <th className="px-2 py-1 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => (
                          <tr key={p.id} className="border-t border-border/40">
                            <td className="px-2 py-1.5 font-medium">{p.user?.display_name ?? p.user_id.slice(0, 8)}</td>
                            <td className="px-2 py-1.5 text-right text-red-400 font-semibold">{p.kills}</td>
                            <td className="px-2 py-1.5 text-right text-blue-400">{p.assists}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{p.deaths}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">
                              {p.deaths === 0 ? p.kills.toFixed(1) : (p.kills / p.deaths).toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold text-amber-400">{p.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa có kết quả chi tiết.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function MatchesPanel({ tournamentId, initialMatches, approvedTeams }: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState(initialMatches);
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultMatch, setResultMatch] = useState<TmsMatch | null>(null);

  const [form, setForm] = useState({
    round: "Vòng bảng",
    round_num: 1,
    team_a_id: "",
    team_b_id: "",
    scheduled_at: "",
  });

  const [genForm, setGenForm] = useState({
    format: "round_robin" as "round_robin" | "knockout" | "hybrid",
    group_size: 4,
    replace: false,
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
          tournament_id: tournamentId, ...form,
          round_num: Number(form.round_num),
          scheduled_at: form.scheduled_at || null,
        }),
      });
      if (!res.ok) { toast.error("Lỗi tạo trận."); return; }
      const match = (await res.json()) as TmsMatch;
      const teamA = approvedTeams.find((t) => t.id === form.team_a_id);
      const teamB = approvedTeams.find((t) => t.id === form.team_b_id);
      setMatches((p) => [...p, { ...match, team_a: teamA, team_b: teamB }]);
      setShowForm(false);
      setForm({ round: "Vòng bảng", round_num: 1, team_a_id: "", team_b_id: "", scheduled_at: "" });
      toast.success("Đã tạo trận.");
      router.refresh();
    } finally { setSaving(false); }
  };

  const generateMatches = async () => {
    if (approvedTeams.length < 2) { toast.error("Cần ít nhất 2 đội được duyệt."); return; }
    setGenerating(true);
    try {
      const res = await fetch(`/api/tms/tournaments/${tournamentId}/generate-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const json = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Lỗi tạo lịch."); return; }
      toast.success(`Đã tạo ${json.count} trận đấu.`);
      setShowGenerate(false);
      router.refresh();
    } finally { setGenerating(false); }
  };

  const onResultSaved = (matchId: string) => {
    setMatches((p) => p.map((m) => m.id === matchId ? { ...m, status: "done" } : m));
    setResultMatch(null);
    router.refresh();
  };

  const onMatchUpdated = (updated: TmsMatch) => {
    setMatches((p) => p.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
  };

  const grouped = matches.reduce<Record<string, TmsMatch[]>>((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  // Stats row
  const pending = matches.filter((m) => m.status === "pending").length;
  const done    = matches.filter((m) => m.status === "done").length;
  const noTime  = matches.filter((m) => m.status === "pending" && !m.scheduled_at).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Swords className="size-4" /> Trận đấu ({matches.length})
          </h2>
          {matches.length > 0 && (
            <div className="flex gap-3 text-[10px]">
              <span className="text-emerald-400">{done} xong</span>
              <span className="text-muted-foreground">{pending} chờ</span>
              {noTime > 0 && <span className="text-amber-400">{noTime} chưa có lịch</span>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"
            onClick={() => { setShowGenerate((p) => !p); setShowForm(false); }}
            className="gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:border-amber-500/60">
            <Zap className="size-3" /> Tạo lịch tự động
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => { setShowForm((p) => !p); setShowGenerate(false); }}
            className="gap-1.5 text-xs">
            <Plus className="size-3" /> Tạo trận
          </Button>
        </div>
      </div>

      {showGenerate && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-400">
            Tạo lịch tự động từ <strong>{approvedTeams.length}</strong> đội đã duyệt
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Format</label>
              <select className={FIELD} value={genForm.format}
                onChange={(e) => setGenForm((p) => ({ ...p, format: e.target.value as typeof genForm.format }))}>
                <option value="round_robin">Round Robin (tất cả gặp nhau)</option>
                <option value="knockout">Knockout (loại trực tiếp)</option>
                <option value="hybrid">Hybrid (bảng → knockout)</option>
              </select>
            </div>
            {genForm.format === "hybrid" && (
              <div>
                <label className={LABEL}>Số đội / bảng</label>
                <input type="number" min={2} max={8} className={FIELD} value={genForm.group_size}
                  onChange={(e) => setGenForm((p) => ({ ...p, group_size: Number(e.target.value) }))} />
              </div>
            )}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={genForm.replace}
                  onChange={(e) => setGenForm((p) => ({ ...p, replace: e.target.checked }))} />
                Xóa trận pending cũ trước
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowGenerate(false)}>Hủy</Button>
            <Button size="sm" onClick={() => void generateMatches()} disabled={generating}
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold">
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
              Tạo lịch
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tạo trận thủ công</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Vòng đấu</label>
              <input className={FIELD} value={form.round}
                onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} placeholder="Vòng bảng A" />
            </div>
            <div>
              <label className={LABEL}>Số thứ tự</label>
              <input type="number" min={1} className={FIELD} value={form.round_num}
                onChange={(e) => setForm((p) => ({ ...p, round_num: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={LABEL}>Đội A</label>
              <select className={FIELD} value={form.team_a_id}
                onChange={(e) => setForm((p) => ({ ...p, team_a_id: e.target.value }))}>
                <option value="">-- chọn đội --</option>
                {approvedTeams.map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Đội B</label>
              <select className={FIELD} value={form.team_b_id}
                onChange={(e) => setForm((p) => ({ ...p, team_b_id: e.target.value }))}>
                <option value="">-- chọn đội --</option>
                {approvedTeams.filter((t) => t.id !== form.team_a_id)
                  .map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Giờ thi đấu</label>
              <input type="datetime-local" className={FIELD} value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
            <Button size="sm" onClick={() => void createMatch()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Tạo trận
            </Button>
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Chưa có trận nào. Dùng "Tạo lịch tự động" để tạo nhanh.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([round, roundMatches]) => (
            <div key={round} className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {round}
                </span>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>{roundMatches.filter((m) => m.status === "done").length}/{roundMatches.length} xong</span>
                  {roundMatches.filter((m) => m.status === "pending" && !m.scheduled_at).length > 0 && (
                    <span className="text-amber-400">
                      {roundMatches.filter((m) => m.status === "pending" && !m.scheduled_at).length} chưa lịch
                    </span>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left w-24">Vòng</th>
                    <th className="px-3 py-2 text-left">Trận</th>
                    <th className="px-3 py-2 text-left w-44">Giờ (nhấn để đặt)</th>
                    <th className="px-3 py-2 text-left w-24">Trạng thái</th>
                    <th className="px-3 py-2 text-left w-28">Thắng</th>
                    <th className="px-3 py-2 w-20 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {roundMatches.map((m) =>
                    m.status === "done" ? (
                      <MatchResultsRow key={m.id} match={m} onUpdated={onMatchUpdated} />
                    ) : (
                      <tr key={m.id} className="border-t border-border/60 hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{m.round}</td>
                        <td className="px-3 py-2 font-semibold text-sm">
                          {m.team_a?.name ?? "?"} <span className="text-muted-foreground mx-1">vs</span> {m.team_b?.name ?? "?"}
                        </td>
                        <ScheduleCell match={m} onUpdated={onMatchUpdated} />
                        <td className={cn("px-3 py-2 text-xs font-semibold", STATUS_COLOR[m.status])}>
                          {MATCH_STATUS_LABELS[m.status]}
                        </td>
                        <td className="px-3 py-2 text-xs text-amber-400 font-bold">—</td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="outline"
                            onClick={() => setResultMatch(m)}
                            className="h-7 gap-1 text-xs">
                            <ClipboardList className="size-3" /> Nhập KQ
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ))}
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
