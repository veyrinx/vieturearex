"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TmsScoreSubmission } from "@/lib/tms/types";

type Profile = { id: string; display_name: string | null; ff_id: string | null };
type Tournament = { id: string; name: string; slug: string; banner_url: string | null };
type Match = { id: string; round: string; team_a?: { name: string } | null; team_b?: { name: string } | null };
type Team = { id: string; name: string; tag: string };

const STATUS_COLOR: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default function SubmitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pastSubs, setPastSubs] = useState<TmsScoreSubmission[]>([]);
  const [submitted, setSubmitted] = useState<TmsScoreSubmission | null>(null);

  const [matchId, setMatchId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [kills, setKills] = useState(0);
  const [assists, setAssists] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => setProfile(p))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    fetch(`/api/tms/tournaments?slug=${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((list: Tournament[] | Tournament | null) => {
        const t = Array.isArray(list) ? list[0] ?? null : list;
        setTournament(t);
        if (t) {
          fetch(`/api/tms/matches?tournament_id=${t.id}`)
            .then((r) => r.json())
            .then((ms: Match[]) => setMatches(ms ?? []))
            .catch(() => {});
          fetch(`/api/tms/teams?tournament_id=${t.id}`)
            .then((r) => r.json())
            .then((ts: Team[]) => setTeams(ts ?? []))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!profile || profile === "loading" || !tournament) return;
    fetch(`/api/tms/submissions?tournament_id=${tournament.id}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((subs: TmsScoreSubmission[]) => setPastSubs(subs ?? []))
      .catch(() => {});
  }, [profile, tournament]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !profile || profile === "loading") return;
    if (!(profile as Profile).ff_id) return;

    setSaving(true);
    try {
      const res = await fetch("/api/tms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tournament_id: tournament.id,
          match_id: matchId || null,
          team_id: teamId || null,
          ff_id: (profile as Profile).ff_id,
          kills,
          assists,
          deaths,
          proof_url: proofUrl || null,
          notes: notes || null,
        }),
      });
      const data = await res.json() as TmsScoreSubmission & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Nộp thất bại."); return; }
      toast.success("Đã nộp kết quả!");
      setSubmitted(data);
      setPastSubs((prev) => [data, ...prev]);
      setMatchId(""); setTeamId(""); setKills(0); setAssists(0); setDeaths(0); setProofUrl(""); setNotes("");
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (profile === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center space-y-4">
        <Trophy className="mx-auto size-10 text-muted-foreground" />
        <p className="text-muted-foreground">Đăng nhập để nộp kết quả</p>
        <Link href={`/login?next=/tournaments/${slug}/submit`}>
          <Button className="rounded-xl">Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  const p = profile as Profile;

  return (
    <div className="py-8 space-y-6">
      {tournament?.banner_url && (
        <div className="rounded-2xl overflow-hidden aspect-[21/5] bg-muted">
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
          {tournament ? tournament.name : "Giải đấu"} — Nộp kết quả thi đấu
        </h1>
      </div>

      {!p.ff_id && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Bạn chưa có FF ID.{" "}
            <Link href={`/setup?next=/tournaments/${slug}/submit`} className="font-semibold underline">
              Thiết lập ngay
            </Link>
          </span>
        </div>
      )}

      {p.ff_id && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Nộp kết quả
          </h2>
          {submitted && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
              <Clock className="size-4 shrink-0" />
              <span>Đã nộp — Đang chờ admin duyệt</span>
            </div>
          )}
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {matches.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chọn trận</label>
                <select
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Không chọn —</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.round}{m.team_a && m.team_b ? ` — ${m.team_a.name} vs ${m.team_b.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {teams.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chọn team</label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Không chọn —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {([["Kills", kills, setKills], ["Assists", assists, setAssists], ["Deaths", deaths, setDeaths]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={val}
                    onChange={(e) => setter(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="h-10 rounded-xl text-center font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Link ảnh proof</label>
              <Input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://..."
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ghi chú</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <Button type="submit" disabled={saving || !tournament} className="h-10 w-full rounded-xl font-bold">
              {saving ? "Đang nộp..." : "Nộp kết quả"}
            </Button>
          </form>
        </div>
      )}

      {pastSubs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Kết quả đã nộp
          </h2>
          <div className="space-y-2">
            {pastSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">
                    {s.match?.round ?? "—"} · K{s.kills}/A{s.assists}/D{s.deaths}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("vi")}
                  </p>
                </div>
                <span className={cn("text-[10px] font-bold uppercase border rounded px-1.5 py-0.5", STATUS_COLOR[s.status])}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
