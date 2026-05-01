"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { untypedFrom } from "@/lib/supabase/untyped";
import type { TmsMatch, TmsTeam } from "@/lib/tms/types";

type Player = {
  user_id: string;
  display_name: string;
  team_id: string;
  kills: number;
  assists: number;
  deaths: number;
};

type Props = {
  match: TmsMatch;
  approvedTeams: TmsTeam[];
  onClose: () => void;
  onSaved: (matchId: string) => void;
};

const FIELD = "h-8 w-full rounded border border-border bg-muted px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary";

export function ResultEntryDialog({ match, approvedTeams, onClose, onSaved }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [winnerId, setWinnerId] = useState(match.team_a_id);
  const [proofUrl, setProofUrl] = useState(match.proof_url ?? "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const teamA = approvedTeams.find((t) => t.id === match.team_a_id) ?? match.team_a as TmsTeam | undefined;
  const teamB = approvedTeams.find((t) => t.id === match.team_b_id) ?? match.team_b as TmsTeam | undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // load members for both teams
        const sb = createClient();
        if (!sb) throw new Error("no client");
        const teamIds = [match.team_a_id, match.team_b_id];
        const { data: members } = await untypedFrom(sb, "tms_team_members")
          .select("user_id, team_id, user:users(display_name)")
          .in("team_id", teamIds) as { data: Array<{ user_id: string; team_id: string; user: { display_name?: string } | null }> | null };

        if (members && members.length > 0) {
          setPlayers(members.map((m) => ({
            user_id: m.user_id,
            team_id: m.team_id,
            display_name: m.user?.display_name ?? "Unknown",
            kills: 0,
            assists: 0,
            deaths: 0,
          })));
        } else {
          // fallback: empty rows for both teams
          setPlayers([
            { user_id: "", team_id: match.team_a_id, display_name: `${teamA?.name ?? "Team A"} - P1`, kills: 0, assists: 0, deaths: 0 },
            { user_id: "", team_id: match.team_b_id, display_name: `${teamB?.name ?? "Team B"} - P1`, kills: 0, assists: 0, deaths: 0 },
          ]);
        }
      } finally { setLoading(false); }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  const setNum = (userId: string, field: "kills" | "assists" | "deaths", val: string) => {
    setPlayers((p) => p.map((pl) =>
      pl.user_id === userId ? { ...pl, [field]: Math.max(0, Math.min(99, Number(val) || 0)) } : pl
    ));
  };

  const submit = async () => {
    if (players.length === 0) { toast.error("Không có player nào."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tms/matches/${match.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: match.tournament_id,
          winner_id: winnerId,
          proof_url: proofUrl || undefined,
          players: players.filter((p) => p.user_id),
        }),
      });
      if (!res.ok) { toast.error("Lỗi lưu kết quả."); return; }
      toast.success("Đã lưu kết quả trận đấu.");
      onSaved(match.id);
    } finally { setSaving(false); }
  };

  const calcPoints = (p: Player) =>
    (p.kills * 2) + p.assists + (p.team_id === winnerId ? 20 : 8);

  const teamPlayers = (teamId: string) => players.filter((p) => p.team_id === teamId);
  const teamScore = (teamId: string) => teamPlayers(teamId).reduce((s, p) => s + calcPoints(p), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-bold uppercase tracking-widest">
            Nhập kết quả: {teamA?.name} vs {teamB?.name}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Winner select */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Đội thắng *</label>
            <div className="flex gap-2">
              {[teamA, teamB].map((t) => t && (
                <button key={t.id} type="button"
                  onClick={() => setWinnerId(t.id)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    winnerId === t.id
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-border bg-background hover:border-border/60"
                  }`}>
                  🏆 {t.name} [{t.tag}]
                </button>
              ))}
            </div>
          </div>

          {/* Proof URL */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Ảnh proof (URL)</label>
            <input className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Score entry per team */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            [teamA, teamB].map((team) => team && (
              <div key={team.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{team.name} [{team.tag}]</p>
                  <span className="text-xs font-bold text-amber-400">{teamScore(team.id)} điểm</span>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest text-muted-foreground">Player</th>
                        <th className="px-2 py-1.5 text-center text-[10px] text-muted-foreground">Kills</th>
                        <th className="px-2 py-1.5 text-center text-[10px] text-muted-foreground">Assists</th>
                        <th className="px-2 py-1.5 text-center text-[10px] text-muted-foreground">Deaths</th>
                        <th className="px-2 py-1.5 text-center text-[10px] text-amber-400">Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers(team.id).map((p) => (
                        <tr key={p.user_id} className="border-t border-border/60">
                          <td className="px-3 py-1.5 font-semibold text-xs">{p.display_name}</td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" min={0} max={99} className={FIELD}
                              value={p.kills} onChange={(e) => setNum(p.user_id, "kills", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" min={0} max={99} className={FIELD}
                              value={p.assists} onChange={(e) => setNum(p.user_id, "assists", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" min={0} max={99} className={FIELD}
                              value={p.deaths} onChange={(e) => setNum(p.user_id, "deaths", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-amber-400 text-xs">
                            {calcPoints(p)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Công thức: kills×2 + assists×1 + thắng(+20) / thua(+8)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onClose}>Huỷ</Button>
              <Button size="sm" onClick={() => void submit()} disabled={saving || loading} className="gap-1.5">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Lưu kết quả
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
