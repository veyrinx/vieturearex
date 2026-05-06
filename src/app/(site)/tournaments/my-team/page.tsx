"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users, Trophy, AlertTriangle, Shield, Plus, Check, Copy,
  Pencil, LogOut, X, UserMinus, Crown, ExternalLink, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import { cn } from "@/lib/utils";

type Profile = { id: string; display_name: string | null; ff_id: string | null; email: string };
type Team = {
  id: string; name: string; tag: string; logo_url: string | null;
  captain_id: string; total_points: number; total_kills: number; created_at: string;
};
type Member = { id: string; user_id: string; joined_at: string; user?: { display_name: string | null; email: string } };
type Reg = {
  id: string; team_id: string; status: "pending" | "approved" | "rejected"; registered_at: string;
  tournament?: { id: string; name: string; slug: string; status: string; start_at: string | null };
};

const REG_COLOR = {
  pending:  "border-amber-500/40 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
};
const REG_LABEL = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
const REG_ICON = { pending: Clock, approved: CheckCircle2, rejected: XCircle };

export default function MyTeamPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [team, setTeam] = useState<Team | null | "loading">("loading");
  const [members, setMembers] = useState<Member[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [copied, setCopied] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [server, setServer] = useState("vn");
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => {
        setProfile(p);
        if (!p) router.push("/login?next=/tournaments/my-team");
      })
      .catch(() => setProfile(null));
  }, [router]);

  useEffect(() => {
    fetch("/api/tms/teams?mine=true", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((t: Team | null) => {
        setTeam(t);
        if (t) {
          setEditName(t.name);
          setEditLogo(t.logo_url ?? "");
        }
      })
      .catch(() => setTeam(null));
  }, []);

  useEffect(() => {
    if (!team || team === "loading") return;
    const t = team as Team;
    Promise.all([
      fetch(`/api/tms/teams/${t.id}/members`, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : [])).then((ms: Member[]) => setMembers(ms ?? [])).catch(() => {}),
      fetch(`/api/tms/teams/${t.id}/registrations`, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : [])).then((rs: Reg[]) => setRegs(rs ?? [])).catch(() => {}),
    ]);
  }, [team]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = profile as Profile;
    if (!p?.ff_id || !p?.display_name) {
      toast.error("Cần thiết lập FF ID và tên hiển thị trước.");
      router.push("/setup?next=/tournaments/my-team");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tms/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), logo_url: logoUrl.trim() || null, server }),
      });
      const data = await res.json() as Team & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Tạo thất bại."); return; }
      toast.success("Đã tạo team!");
      setTeam(data);
      setEditName(data.name);
      setEditLogo(data.logo_url ?? "");
    } catch { toast.error("Lỗi mạng, thử lại."); }
    finally { setSaving(false); }
  };

  const onEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = team as Team;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/tms/teams/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: editName.trim(), logo_url: editLogo.trim() || null }),
      });
      const data = await res.json() as Team & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Cập nhật thất bại."); return; }
      toast.success("Đã cập nhật team!");
      setTeam(data);
      setEditing(false);
    } catch { toast.error("Lỗi mạng."); }
    finally { setEditSaving(false); }
  };

  const kickOrLeave = async (targetUserId: string, isKick: boolean) => {
    const t = team as Team;
    const label = isKick ? "kick thành viên này" : "rời team";
    if (!confirm(`Bạn có chắc muốn ${label}?`)) return;
    const url = isKick
      ? `/api/tms/teams/${t.id}/members?user_id=${targetUserId}`
      : `/api/tms/teams/${t.id}/members`;
    const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) { toast.error(data.error ?? "Thất bại."); return; }
    if (isKick) {
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      toast.success("Đã kick thành viên.");
    } else {
      toast.success("Đã rời team.");
      setTeam(null);
      setMembers([]);
    }
  };

  const copyInvite = () => {
    const t = team as Team;
    void navigator.clipboard.writeText(`${window.location.origin}/teams/${t.id}/join`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (profile === "loading" || team === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const p = profile as Profile;
  const missingSetup = !p.ff_id || !p.display_name;
  const t = team as Team | null;
  const isCaptain = t?.captain_id === p.id;

  return (
    <div className="py-10 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Users className="size-7 text-primary dark:text-amber-400" />
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">Team của tôi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Quản lý team thi đấu của bạn</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
        <div className="size-12 rounded-xl bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center">
          <Shield className="size-6 text-primary dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{p.display_name ?? <span className="text-muted-foreground italic">Chưa đặt tên</span>}</p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">FF ID</p>
          <p className={cn("text-sm font-bold font-mono", p.ff_id ? "text-amber-400" : "text-red-400")}>
            {p.ff_id ?? "Chưa có"}
          </p>
        </div>
      </div>

      {missingSetup && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cần thiết lập tài khoản trước</p>
            <p className="text-xs opacity-80 mb-3">Bạn cần có <strong>tên hiển thị</strong> và <strong>FF ID</strong> để tạo hoặc tham gia team.</p>
            <Link href="/setup?next=/tournaments/my-team"><Button size="sm" className="h-8 rounded-lg text-xs font-bold">Thiết lập ngay</Button></Link>
          </div>
        </div>
      )}

      {!missingSetup && t && (
        <div className="space-y-4">
          {/* Team card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            {!editing ? (
              <div className="flex items-center gap-3">
                {t.logo_url
                  ? <img src={t.logo_url} alt={t.name} className="size-14 rounded-xl object-cover shrink-0" />
                  : <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-sm font-black text-muted-foreground shrink-0">{t.tag.slice(0, 2)}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-lg leading-tight">{t.name}</h2>
                    {isCaptain && <Crown className="size-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">[{t.tag}]</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isCaptain && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-8 rounded-lg gap-1.5 text-xs">
                      <Pencil className="size-3" /> Sửa
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void onEditSave(e)} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chỉnh sửa team</p>
                  <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên team</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} required className="h-9 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logo</label>
                  <div className="flex gap-2 items-center">
                    {editLogo && <img src={editLogo} alt="" className="size-9 rounded-lg object-cover border border-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <Input value={editLogo} onChange={(e) => setEditLogo(e.target.value)} placeholder="https://..." className="h-9 rounded-xl flex-1" />
                    <ImageUploadButton onUploaded={setEditLogo} bucket="logos" label="Tải" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={editSaving} size="sm" className="h-9 rounded-xl font-bold flex-1">
                    {editSaving ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} className="h-9 rounded-xl">Hủy</Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Điểm", value: t.total_points },
                { label: "Kills", value: t.total_kills },
                { label: "Thành viên", value: members.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Users className="size-3.5" /> Thành viên ({members.length})
            </h3>
            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {(m.user?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <Link href={`/players/${m.user_id}`} className="flex-1 font-medium hover:text-primary dark:hover:text-amber-400 transition-colors">
                    {m.user?.display_name ?? m.user?.email ?? "?"}
                  </Link>
                  {m.user_id === t.captain_id && <Crown className="size-3 text-amber-400 shrink-0" />}
                  {isCaptain && m.user_id !== p.id && (
                    <button onClick={() => void kickOrLeave(m.user_id, true)} title="Kick" className="text-muted-foreground hover:text-red-400 transition-colors">
                      <UserMinus className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tournament registrations */}
          {regs.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Trophy className="size-3.5" /> Đăng ký giải đấu ({regs.length})
              </h3>
              <div className="space-y-2">
                {regs.map((r) => {
                  const Icon = REG_ICON[r.status];
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        {r.tournament ? (
                          <Link href={`/tournaments/${r.tournament.slug}`}
                            className="font-semibold text-sm hover:text-primary dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                            {r.tournament.name} <ExternalLink className="size-3 shrink-0" />
                          </Link>
                        ) : (
                          <p className="font-semibold text-sm text-muted-foreground">—</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">{new Date(r.registered_at).toLocaleDateString("vi")}</p>
                      </div>
                      <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 shrink-0", REG_COLOR[r.status])}>
                        <Icon className="size-2.5" />
                        {REG_LABEL[r.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invite */}
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 dark:border-amber-400/30 dark:bg-amber-400/5 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-amber-400">Mời đồng đội</p>
            <button onClick={copyInvite}
              className="flex items-center gap-2 rounded-lg border border-primary/30 dark:border-amber-400/30 bg-background px-3 py-2 text-xs font-semibold text-primary dark:text-amber-400 hover:bg-primary/5 transition-colors w-full">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Đã copy!" : `…/teams/${t.id.slice(0, 8)}/join`}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href="/tournaments" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl">
                <Trophy className="size-4 mr-2" /> Xem giải đấu
              </Button>
            </Link>
            {!isCaptain && (
              <Button variant="outline" onClick={() => void kickOrLeave(p.id, false)}
                className="rounded-xl border-red-500/30 text-red-400 hover:border-red-500/60 hover:text-red-400 gap-1.5">
                <LogOut className="size-4" /> Rời team
              </Button>
            )}
          </div>
        </div>
      )}

      {/* No team: create form */}
      {!missingSetup && !t && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary dark:text-amber-400" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest">Tạo team mới</h2>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Thông tin người chơi</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{p.display_name}</span>
              <span className="text-xs font-mono text-amber-400">FF: {p.ff_id}</span>
            </div>
          </div>

          <form onSubmit={(e) => void onCreate(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên team <span className="text-red-400">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: Arex Gaming" required maxLength={40} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tag team (2–8 ký tự) <span className="text-red-400">*</span></label>
              <Input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="vd: AREX" required minLength={2} maxLength={8} className="h-10 rounded-xl font-mono tracking-widest" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Server</label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="vn">🇻🇳 VN Server</option>
                <option value="sg">🌏 SG/SEA Server</option>
                <option value="global">🌐 Global</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logo team</label>
              <div className="flex items-center gap-2">
                {logoUrl && <img src={logoUrl} alt="" className="size-10 rounded-xl object-cover border border-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="h-10 rounded-xl flex-1" />
                <ImageUploadButton onUploaded={setLogoUrl} bucket="logos" label="Tải lên" />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="h-10 w-full rounded-xl font-bold">
              {saving ? "Đang tạo..." : "Tạo team"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
