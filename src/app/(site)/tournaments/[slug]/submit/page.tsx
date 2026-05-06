"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, AlertTriangle, Zap, CreditCard, CheckCircle2, ScanLine, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TmsScoreSubmission } from "@/lib/tms/types";
import type { OcrPlayer } from "@/lib/server/ff-ocr";

type Profile = { id: string; display_name: string | null; ff_id: string | null };
type Tournament = { id: string; name: string; slug: string; banner_url: string | null };
type Match = { id: string; round: string; team_a?: { name: string } | null; team_b?: { name: string } | null };
type Team = { id: string; name: string; tag: string };
type Quota = { used: number; limit: number; payment_price: string; payment_info: string; payment_qr_url: string };

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

export default function SubmitPage() {
  const { slug } = useParams<{ slug: string }>();

  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pastSubs, setPastSubs] = useState<TmsScoreSubmission[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [submitted, setSubmitted] = useState<TmsScoreSubmission | null>(null);

  const [matchId, setMatchId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [kills, setKills] = useState(0);
  const [assists, setAssists] = useState(0);
  const [deaths, setDeaths] = useState(0);
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
    Promise.all([
      fetch(`/api/tms/submissions?tournament_id=${tournament.id}`, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : []))
        .then((subs: TmsScoreSubmission[]) => setPastSubs(subs ?? []))
        .catch(() => {}),
      fetch("/api/tms/submissions?quota=true", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((q: Quota | null) => setQuota(q))
        .catch(() => {}),
    ]);
  }, [profile, tournament]);

  const applyOcrPlayer = (p: OcrPlayer) => {
    setKills(p.kills);
    setAssists(p.assists);
    setDeaths(p.deaths);
    setOcrPlayers(null);
    toast.success(`Đã điền K/A/D của ${p.name}`);
  };

  const runOcr = async (payload: { url?: string; base64?: string; media_type?: string }) => {
    setOcrLoading(true);
    setOcrPlayers(null);
    try {
      const res = await fetch("/api/tms/parse-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { players?: OcrPlayer[]; error?: string };
      if (!res.ok || data.error) { toast.error(data.error ?? "OCR thất bại"); return; }
      if (!data.players || data.players.length === 0) { toast.warning("Không tìm thấy dữ liệu trong ảnh"); return; }
      if (data.players.length === 1) {
        applyOcrPlayer(data.players[0]);
      } else {
        setOcrPlayers(data.players);
      }
    } catch {
      toast.error("Lỗi khi nhận dạng ảnh");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrUrl = () => {
    if (!ocrUrl.trim()) return;
    void runOcr({ url: ocrUrl.trim() });
    if (!proofUrl) setProofUrl(ocrUrl.trim());
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const media_type = header.replace("data:", "").replace(";base64", "");
      void runOcr({ base64, media_type });
    };
    reader.readAsDataURL(file);
  };

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
      const data = await res.json() as TmsScoreSubmission & { error?: string; used?: number; limit?: number; payment_info?: string; payment_qr_url?: string; payment_price?: string };
      if (res.status === 402) {
        // Update quota state with returned values
        setQuota({ used: data.used ?? 0, limit: data.limit ?? 4, payment_info: data.payment_info ?? "", payment_qr_url: data.payment_qr_url ?? "", payment_price: data.payment_price ?? "" });
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Nộp thất bại."); return; }
      toast.success("Đã nộp kết quả!");
      setSubmitted(data);
      setPastSubs((prev) => [data, ...prev]);
      setQuota((q) => q ? { ...q, used: q.used + 1 } : q);
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
  const quotaExceeded = quota !== null && quota.used >= quota.limit;

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

      {/* Quota indicator */}
      {p.ff_id && quota && (
        <div className={cn(
          "rounded-xl border p-3 flex items-center gap-3",
          quotaExceeded
            ? "border-red-500/30 bg-red-500/8"
            : quota.used >= quota.limit - 1
              ? "border-amber-500/30 bg-amber-500/8"
              : "border-border bg-muted/30",
        )}>
          <Zap className={cn("size-4 shrink-0", quotaExceeded ? "text-red-400" : quota.used >= quota.limit - 1 ? "text-amber-400" : "text-primary")} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">
              {quotaExceeded
                ? "Đã dùng hết lượt miễn phí tuần này"
                : `Còn ${quota.limit - quota.used} lượt miễn phí`}
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", quotaExceeded ? "bg-red-400" : "bg-primary dark:bg-amber-400")}
                style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
              />
            </div>
          </div>
          <span className={cn("text-xs font-mono font-bold shrink-0", quotaExceeded ? "text-red-400" : "text-muted-foreground")}>
            {quota.used}/{quota.limit}
          </span>
        </div>
      )}

      {/* Payment gate */}
      {p.ff_id && quotaExceeded && quota && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary dark:text-amber-400" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest">Nộp có phí</h2>
            {quota.payment_price && (
              <span className="ml-auto text-sm font-bold text-amber-400">{quota.payment_price} / lần</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bạn đã dùng hết <strong>{quota.limit} lần miễn phí</strong> trong tuần này. Để tiếp tục nộp kết quả, hãy thanh toán và gửi bằng chứng vào phần ghi chú bên dưới.
          </p>

          {(quota.payment_info || quota.payment_qr_url) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              {quota.payment_qr_url && (
                <div className="flex justify-center">
                  <img src={quota.payment_qr_url} alt="QR thanh toán" className="max-w-[180px] rounded-xl border border-border" />
                </div>
              )}
              {quota.payment_info && (
                <p className="text-xs text-center text-muted-foreground whitespace-pre-line leading-relaxed">{quota.payment_info}</p>
              )}
            </div>
          )}

          {!quota.payment_info && !quota.payment_qr_url && (
            <p className="text-xs text-muted-foreground italic">Liên hệ admin để biết thông tin thanh toán.</p>
          )}
        </div>
      )}

      {p.ff_id && (!quotaExceeded || quota === null) && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Nộp kết quả
          </h2>
          {submitted && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Đã nộp thành công — Đang chờ admin duyệt</span>
            </div>
          )}
          {/* OCR auto-fill */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-amber-400 flex items-center gap-1.5">
              <ScanLine className="size-3.5" /> Tự động nhận dạng từ ảnh
            </p>
            <div className="flex gap-2">
              <Input
                value={ocrUrl}
                onChange={(e) => setOcrUrl(e.target.value)}
                placeholder="Dán link ảnh kết quả / share link..."
                className="h-9 rounded-xl text-xs flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleOcrUrl(); } }}
              />
              <Button type="button" size="sm" variant="outline" disabled={ocrLoading || !ocrUrl.trim()} onClick={handleOcrUrl} className="h-9 rounded-xl shrink-0 text-xs">
                {ocrLoading ? "..." : "OCR"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <Button type="button" size="sm" variant="outline" disabled={ocrLoading} onClick={() => fileRef.current?.click()} className="h-9 rounded-xl shrink-0 text-xs gap-1">
                <Upload className="size-3" /> Upload
              </Button>
            </div>
            {ocrPlayers && ocrPlayers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">Chọn tên của bạn để điền K/A/D:</p>
                <div className="space-y-1">
                  {ocrPlayers.map((p, i) => (
                    <button key={i} type="button" onClick={() => applyOcrPlayer(p)}
                      className="w-full flex items-center justify-between rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 px-3 py-1.5 text-xs transition-colors text-left">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-muted-foreground font-mono">K{p.kills} A{p.assists} D{p.deaths}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setOcrPlayers(null)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-1">
                    <X className="size-3" /> Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

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

      {/* Paid submission form when quota exceeded */}
      {p.ff_id && quotaExceeded && quota && (
        <div className="rounded-2xl border border-primary/20 dark:border-amber-400/20 bg-card p-5 space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-primary dark:text-amber-400">
            Nộp kèm chứng từ thanh toán
          </h2>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
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
            <div className="grid grid-cols-3 gap-3">
              {([["Kills", kills, setKills], ["Assists", assists, setAssists], ["Deaths", deaths, setDeaths]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
                  <Input type="number" min={0} max={99} value={val} onChange={(e) => setter(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))} className="h-10 rounded-xl text-center font-mono" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Link proof kết quả <span className="text-red-400">*</span>
              </label>
              <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." required className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Mã giao dịch / Chứng từ thanh toán <span className="text-red-400">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                required
                placeholder="Nhập mã giao dịch hoặc link ảnh chuyển khoản..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <Button type="submit" disabled={saving || !tournament || !notes.trim()} className="h-10 w-full rounded-xl font-bold bg-primary dark:bg-amber-400 dark:text-black">
              {saving ? "Đang nộp..." : `Nộp có phí${quota.payment_price ? ` (${quota.payment_price})` : ""}`}
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
