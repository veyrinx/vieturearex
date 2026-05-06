"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, AlertTriangle, Zap, CreditCard, CheckCircle2, ScanLine, Upload, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TmsScoreSubmission } from "@/lib/tms/types";
import type { OcrPlayer } from "@/lib/server/ff-ocr";
import { getPlacementPoints, getTotalScore, PLACEMENT_TABLE } from "@/lib/tms/scoring";

type Profile = { id: string; display_name: string | null; ff_id: string | null };
type Tournament = { id: string; name: string; slug: string; banner_url: string | null };
type Match = { id: string; round: string; team_a?: { name: string } | null; team_b?: { name: string } | null };
type Team = { id: string; name: string; tag: string };
type TeamMember = { id: string; user_id: string; user?: { display_name: string | null; ff_id?: string | null } };
type Quota = { used: number; limit: number; payment_price: string; payment_info: string; payment_qr_url: string };
type PlayerRow = { ff_id: string; display_name: string; kills: number; assists: number; deaths: number; damage: number };

const PLACEMENTS = Array.from({ length: 12 }, (_, i) => i + 1).concat([13]);

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

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={99999}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      className="w-full h-8 rounded-lg border border-border bg-background px-2 text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

export default function SubmitPage() {
  const { slug } = useParams<{ slug: string }>();

  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pastSubs, setPastSubs] = useState<TmsScoreSubmission[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [matchId, setMatchId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [placement, setPlacement] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [ocrUrl, setOcrUrl] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPlayers, setOcrPlayers] = useState<OcrPlayer[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
            .then((r) => r.json()).then((ms: Match[]) => setMatches(ms ?? [])).catch(() => {});
          fetch(`/api/tms/teams?tournament_id=${t.id}`)
            .then((r) => r.json()).then((ts: Team[]) => setTeams(ts ?? [])).catch(() => {});
        }
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!profile || profile === "loading" || !tournament) return;
    Promise.all([
      fetch(`/api/tms/submissions?tournament_id=${tournament.id}`, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : [])).then((subs: TmsScoreSubmission[]) => setPastSubs(subs ?? [])).catch(() => {}),
      fetch("/api/tms/submissions?quota=true", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null)).then((q: Quota | null) => setQuota(q)).catch(() => {}),
    ]);
  }, [profile, tournament]);

  // Fetch members when team changes
  useEffect(() => {
    if (!teamId) { setTeamMembers([]); setPlayers([]); return; }
    fetch(`/api/tms/teams/${teamId}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then((ms: TeamMember[]) => {
        setTeamMembers(ms ?? []);
        setPlayers((ms ?? []).map((m) => ({
          ff_id: m.user?.ff_id ?? "",
          display_name: m.user?.display_name ?? "Thành viên",
          kills: 0, assists: 0, deaths: 0, damage: 0,
        })));
      })
      .catch(() => { setTeamMembers([]); setPlayers([]); });
  }, [teamId]);

  // If no team selected, single-player mode
  useEffect(() => {
    if (!teamId && profile && profile !== "loading") {
      const p = profile as Profile;
      setPlayers([{ ff_id: p.ff_id ?? "", display_name: p.display_name ?? "", kills: 0, assists: 0, deaths: 0, damage: 0 }]);
    }
  }, [teamId, profile]);

  const updatePlayer = (idx: number, field: keyof PlayerRow, val: string | number) => {
    setPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const applyOcrPlayer = (ocr: OcrPlayer, idx?: number) => {
    if (idx !== undefined) {
      setPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, kills: ocr.kills, assists: ocr.assists, deaths: ocr.deaths } : p));
    } else if (players.length === 1) {
      setPlayers((prev) => [{ ...prev[0], kills: ocr.kills, assists: ocr.assists, deaths: ocr.deaths }]);
    }
    setOcrPlayers(null);
    toast.success(`Đã điền K/A/D cho ${ocr.name}`);
  };

  const runOcr = async (payload: { url?: string; base64?: string; media_type?: string }) => {
    setOcrLoading(true); setOcrPlayers(null);
    try {
      const res = await fetch("/api/tms/parse-result", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { players?: OcrPlayer[]; error?: string };
      if (!res.ok || data.error) { toast.error(data.error ?? "OCR thất bại"); return; }
      if (!data.players?.length) { toast.warning("Không tìm thấy dữ liệu trong ảnh"); return; }

      // Auto-match OCR results to player rows by name similarity
      if (players.length > 1 && data.players.length > 0) {
        setPlayers((prev) => {
          const updated = [...prev];
          data.players!.forEach((ocr) => {
            const idx = updated.findIndex(
              (p) => p.display_name.toLowerCase().includes(ocr.name.toLowerCase()) ||
                     ocr.name.toLowerCase().includes(p.display_name.toLowerCase())
            );
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], kills: ocr.kills, assists: ocr.assists, deaths: ocr.deaths };
            }
          });
          return updated;
        });
        toast.success(`OCR: điền tự động cho ${data.players.length} người chơi`);
      } else if (data.players.length === 1) {
        applyOcrPlayer(data.players[0]);
      } else {
        setOcrPlayers(data.players);
      }
    } catch { toast.error("Lỗi khi nhận dạng ảnh"); }
    finally { setOcrLoading(false); }
  };

  const handleOcrUrl = () => { if (!ocrUrl.trim()) return; void runOcr({ url: ocrUrl.trim() }); if (!proofUrl) setProofUrl(ocrUrl.trim()); };
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [header, base64] = (reader.result as string).split(",");
      void runOcr({ base64, media_type: header.replace("data:", "").replace(";base64", "") });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !profile || profile === "loading") return;
    const validPlayers = players.filter((p) => p.ff_id);
    if (!validPlayers.length) { toast.error("Cần ít nhất 1 thành viên có FF ID."); return; }

    setSaving(true);
    try {
      const payload = validPlayers.length === 1
        ? {
            tournament_id: tournament.id,
            match_id: matchId || null,
            team_id: teamId || null,
            ff_id: validPlayers[0].ff_id,
            placement: placement ?? null,
            kills: validPlayers[0].kills,
            assists: validPlayers[0].assists,
            deaths: validPlayers[0].deaths,
            damage: validPlayers[0].damage,
            proof_url: proofUrl || null,
            notes: notes || null,
          }
        : {
            tournament_id: tournament.id,
            match_id: matchId || null,
            team_id: teamId || null,
            placement: placement ?? null,
            players: validPlayers,
            proof_url: proofUrl || null,
            notes: notes || null,
          };

      const res = await fetch("/api/tms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json() as TmsScoreSubmission & { error?: string; used?: number; limit?: number; payment_info?: string; payment_qr_url?: string; payment_price?: string };
      if (res.status === 402) {
        setQuota({ used: data.used ?? 0, limit: data.limit ?? 4, payment_info: data.payment_info ?? "", payment_qr_url: data.payment_qr_url ?? "", payment_price: data.payment_price ?? "" });
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Nộp thất bại."); return; }
      toast.success("Đã nộp kết quả!");
      setSubmitted(true);
      const newSubs = Array.isArray(data) ? data : [data];
      setPastSubs((prev) => [...newSubs, ...prev]);
      setQuota((q) => q ? { ...q, used: q.used + 1 } : q);
      setMatchId(""); setTeamId(""); setPlacement(null); setProofUrl(""); setNotes("");
      setPlayers(players.map((p) => ({ ...p, kills: 0, assists: 0, deaths: 0, damage: 0 })));
    } catch { toast.error("Lỗi mạng, vui lòng thử lại."); }
    finally { setSaving(false); }
  };

  if (profile === "loading") {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="py-16 text-center space-y-4">
        <Trophy className="mx-auto size-10 text-muted-foreground" />
        <p className="text-muted-foreground">Đăng nhập để nộp kết quả</p>
        <Link href={`/login?next=/tournaments/${slug}/submit`}><Button className="rounded-xl">Đăng nhập</Button></Link>
      </div>
    );
  }

  const p = profile as Profile;
  const quotaExceeded = quota !== null && quota.used >= quota.limit;

  return (
    <div className="py-8 max-w-2xl mx-auto space-y-6">
      {tournament?.banner_url && (
        <div className="rounded-2xl overflow-hidden aspect-[21/5] bg-muted">
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
        {tournament ? tournament.name : "Giải đấu"} — Nộp kết quả
      </h1>

      {!p.ff_id && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Bạn chưa có FF ID. <Link href={`/setup?next=/tournaments/${slug}/submit`} className="font-semibold underline">Thiết lập ngay</Link></span>
        </div>
      )}

      {/* Quota */}
      {p.ff_id && quota && (
        <div className={cn("rounded-xl border p-3 flex items-center gap-3", quotaExceeded ? "border-red-500/30 bg-red-500/8" : quota.used >= quota.limit - 1 ? "border-amber-500/30 bg-amber-500/8" : "border-border bg-muted/30")}>
          <Zap className={cn("size-4 shrink-0", quotaExceeded ? "text-red-400" : quota.used >= quota.limit - 1 ? "text-amber-400" : "text-primary")} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{quotaExceeded ? "Đã dùng hết lượt miễn phí tuần này" : `Còn ${quota.limit - quota.used} lượt miễn phí`}</p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", quotaExceeded ? "bg-red-400" : "bg-primary dark:bg-amber-400")} style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }} />
            </div>
          </div>
          <span className={cn("text-xs font-mono font-bold shrink-0", quotaExceeded ? "text-red-400" : "text-muted-foreground")}>{quota.used}/{quota.limit}</span>
        </div>
      )}

      {/* Payment gate */}
      {p.ff_id && quotaExceeded && quota && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary dark:text-amber-400" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest">Nộp có phí</h2>
            {quota.payment_price && <span className="ml-auto text-sm font-bold text-amber-400">{quota.payment_price} / lần</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">Bạn đã dùng hết <strong>{quota.limit} lần miễn phí</strong> trong tuần này.</p>
          {(quota.payment_info || quota.payment_qr_url) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              {quota.payment_qr_url && <div className="flex justify-center"><img src={quota.payment_qr_url} alt="QR thanh toán" className="max-w-[180px] rounded-xl border border-border" /></div>}
              {quota.payment_info && <p className="text-xs text-center text-muted-foreground whitespace-pre-line">{quota.payment_info}</p>}
            </div>
          )}
        </div>
      )}

      {p.ff_id && (!quotaExceeded || quota === null) && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">Nộp kết quả</h2>

          {submitted && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" /><span>Đã nộp thành công — Đang chờ admin duyệt</span>
            </div>
          )}

          {/* OCR */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-amber-400 flex items-center gap-1.5">
              <ScanLine className="size-3.5" /> Tự động nhận dạng từ ảnh
            </p>
            <div className="flex gap-2">
              <Input value={ocrUrl} onChange={(e) => setOcrUrl(e.target.value)} placeholder="Dán link ảnh kết quả..." className="h-9 rounded-xl text-xs flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleOcrUrl(); } }} />
              <Button type="button" size="sm" variant="outline" disabled={ocrLoading || !ocrUrl.trim()} onClick={handleOcrUrl} className="h-9 rounded-xl shrink-0 text-xs">{ocrLoading ? "..." : "OCR"}</Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <Button type="button" size="sm" variant="outline" disabled={ocrLoading} onClick={() => fileRef.current?.click()} className="h-9 rounded-xl shrink-0 text-xs gap-1">
                <Upload className="size-3" /> Upload
              </Button>
            </div>
            {ocrPlayers && ocrPlayers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">Chọn thành viên để điền K/A/D:</p>
                <div className="space-y-1">
                  {ocrPlayers.map((ocr, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 text-xs font-semibold">{ocr.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">K{ocr.kills} A{ocr.assists} D{ocr.deaths}</span>
                      {players.map((pl, pi) => (
                        <button key={pi} type="button" onClick={() => applyOcrPlayer(ocr, pi)}
                          className="text-[10px] rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-primary hover:bg-primary/20">
                          → {pl.display_name.split(" ").pop()}
                        </button>
                      ))}
                    </div>
                  ))}
                  <button type="button" onClick={() => setOcrPlayers(null)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-1">
                    <X className="size-3" /> Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {/* Match & Team selectors */}
            <div className="grid sm:grid-cols-2 gap-3">
              {matches.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chọn trận</label>
                  <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">— Không chọn —</option>
                    {matches.map((m) => <option key={m.id} value={m.id}>{m.round}{m.team_a && m.team_b ? ` — ${m.team_a.name} vs ${m.team_b.name}` : ""}</option>)}
                  </select>
                </div>
              )}
              {teams.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chọn team</label>
                  <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">— Không chọn —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Placement + Score preview */}
            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vị trí kết thúc (Top)</label>
                <select
                  value={placement ?? ""}
                  onChange={(e) => setPlacement(e.target.value ? parseInt(e.target.value) : null)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Chưa chọn —</option>
                  {PLACEMENTS.map((r) => {
                    const pts = getPlacementPoints(r);
                    return <option key={r} value={r}>#{r === 13 ? "13+" : r} — {pts > 0 ? `+${pts} điểm` : "0 điểm"}</option>;
                  })}
                </select>
              </div>

              {/* Score preview */}
              <div className="rounded-xl border border-primary/20 dark:border-amber-400/20 bg-primary/5 dark:bg-amber-400/5 p-3 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Điểm vị trí: <span className="font-mono font-bold text-foreground">{getPlacementPoints(placement)}</span></p>
                  <p>Điểm kill: <span className="font-mono font-bold text-foreground">+{players.reduce((s, p) => s + p.kills, 0)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tổng điểm</p>
                  <p className="text-2xl font-black text-primary dark:text-amber-400 leading-none">
                    {getTotalScore(placement, players.reduce((s, p) => s + p.kills, 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Scoring table reference */}
            <details className="group">
              <summary className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground select-none">
                Bảng điểm Garena ▾
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLACEMENT_TABLE.map(({ rank, pts }) => (
                  <span key={rank} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-mono">
                    {rank}: <span className="font-bold text-amber-400">{pts}đ</span>
                  </span>
                ))}
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary dark:text-amber-400">
                  Kill: +1đ/kill
                </span>
              </div>
            </details>

            {/* Players table */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {teamId && teamMembers.length > 0 ? `Thành viên (${players.length})` : "Kết quả của bạn"}
                </label>
              </div>

              {/* Header */}
              <div className="grid gap-1" style={{ gridTemplateColumns: teamId && players.length > 1 ? "minmax(0,1.5fr) 1fr 1fr 1fr 1fr" : "minmax(0,1.5fr) 1fr 1fr 1fr 1fr" }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Tên / FF ID</span>
                {["Kills", "Damage", "Assists", "Deaths"].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{h}</span>
                ))}
              </div>

              {players.map((pl, idx) => (
                <div key={idx} className="grid gap-1 items-center rounded-xl border border-border bg-muted/20 px-2 py-2"
                  style={{ gridTemplateColumns: "minmax(0,1.5fr) 1fr 1fr 1fr 1fr" }}>
                  <div className="px-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{pl.display_name || "—"}</p>
                    {pl.ff_id
                      ? <p className="text-[10px] font-mono text-amber-400 truncate">{pl.ff_id}</p>
                      : <input value={pl.ff_id} onChange={(e) => updatePlayer(idx, "ff_id", e.target.value)}
                          placeholder="FF ID" className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                    }
                  </div>
                  <NumInput value={pl.kills} onChange={(v) => updatePlayer(idx, "kills", v)} />
                  <NumInput value={pl.damage} onChange={(v) => updatePlayer(idx, "damage", v)} />
                  <NumInput value={pl.assists} onChange={(v) => updatePlayer(idx, "assists", v)} />
                  <NumInput value={pl.deaths} onChange={(v) => updatePlayer(idx, "deaths", v)} />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Link ảnh proof</label>
              <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ghi chú</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>

            <Button type="submit" disabled={saving || !tournament} className="h-10 w-full rounded-xl font-bold">
              {saving ? "Đang nộp..." : players.length > 1 ? `Nộp kết quả (${players.length} thành viên)` : "Nộp kết quả"}
            </Button>
          </form>
        </div>
      )}

      {/* Paid form */}
      {p.ff_id && quotaExceeded && quota && (
        <div className="rounded-2xl border border-primary/20 dark:border-amber-400/20 bg-card p-5 space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-primary dark:text-amber-400">Nộp kèm chứng từ thanh toán</h2>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {matches.length > 0 && (
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Không chọn trận —</option>
                {matches.map((m) => <option key={m.id} value={m.id}>{m.round}</option>)}
              </select>
            )}
            {teams.length > 0 && (
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Không chọn team —</option>
                {teams.map((t) => <option key={t.id} value={t.id}>[{t.tag}] {t.name}</option>)}
              </select>
            )}
            <div className="space-y-2">
              {players.map((pl, idx) => (
                <div key={idx} className="grid gap-1 items-center rounded-xl border border-border bg-muted/20 px-2 py-2"
                  style={{ gridTemplateColumns: "minmax(0,1.5fr) 1fr 1fr 1fr 1fr" }}>
                  <div className="px-1"><p className="text-xs font-semibold truncate">{pl.display_name}</p><p className="text-[10px] font-mono text-amber-400">{pl.ff_id}</p></div>
                  <NumInput value={pl.kills} onChange={(v) => updatePlayer(idx, "kills", v)} />
                  <NumInput value={pl.damage} onChange={(v) => updatePlayer(idx, "damage", v)} />
                  <NumInput value={pl.assists} onChange={(v) => updatePlayer(idx, "assists", v)} />
                  <NumInput value={pl.deaths} onChange={(v) => updatePlayer(idx, "deaths", v)} />
                </div>
              ))}
            </div>
            <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Link proof *" required className="h-10 rounded-xl" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} required placeholder="Mã giao dịch / chứng từ thanh toán..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            <Button type="submit" disabled={saving || !tournament || !notes.trim()} className="h-10 w-full rounded-xl font-bold bg-primary dark:bg-amber-400 dark:text-black">
              {saving ? "Đang nộp..." : `Nộp có phí${quota.payment_price ? ` (${quota.payment_price})` : ""}`}
            </Button>
          </form>
        </div>
      )}

      {pastSubs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">Kết quả đã nộp</h2>
          <div className="space-y-2">
            {pastSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">
                    {s.match?.round ?? "—"}
                    {s.placement ? ` · #${s.placement}` : ""}
                    {` · K${s.kills} A${s.assists} D${s.deaths}`}
                    {s.damage ? ` Dame${s.damage}` : ""}
                    {" · "}
                    <span className="text-amber-400 font-bold">{getTotalScore(s.placement, s.kills)}đ</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("vi")}</p>
                </div>
                <span className={cn("text-[10px] font-bold uppercase border rounded px-1.5 py-0.5", STATUS_COLOR[s.status])}>{STATUS_LABEL[s.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
