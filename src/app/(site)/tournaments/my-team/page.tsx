"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Trophy, AlertTriangle, Shield, Plus, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Profile = { id: string; display_name: string | null; ff_id: string | null; email: string };
type Team = {
  id: string; name: string; tag: string; logo_url: string | null;
  total_points: number; total_kills: number; created_at: string;
};
type Member = { id: string; user_id: string; joined_at: string; user?: { display_name: string | null; email: string } };

export default function MyTeamPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [team, setTeam] = useState<Team | null | "loading">("loading");
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);

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
      .then((t: Team | null) => setTeam(t))
      .catch(() => setTeam(null));
  }, []);

  useEffect(() => {
    if (!team || team === "loading") return;
    fetch(`/api/tms/teams/${team.id}/members`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((ms: Member[]) => setMembers(ms ?? []))
      .catch(() => {});
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
        body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), logo_url: logoUrl.trim() || null }),
      });
      const data = await res.json() as Team & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Tạo thất bại."); return; }
      toast.success("Đã tạo team!");
      setTeam(data);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = () => {
    const url = `${window.location.origin}/join`;
    void navigator.clipboard.writeText(url);
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

  return (
    <div className="py-10 space-y-8 max-w-2xl mx-auto">
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

      {/* Missing setup warning */}
      {missingSetup && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cần thiết lập tài khoản trước</p>
            <p className="text-xs opacity-80 mb-3">
              Bạn cần có <strong>tên hiển thị</strong> và <strong>FF ID</strong> để tạo hoặc tham gia team.
            </p>
            <Link href="/setup?next=/tournaments/my-team">
              <Button size="sm" className="h-8 rounded-lg text-xs font-bold">
                Thiết lập ngay
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Has team */}
      {!missingSetup && team && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="size-12 rounded-xl object-cover" />
                : <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-sm font-black text-muted-foreground">{team.tag.slice(0, 2)}</div>
              }
              <div>
                <h2 className="font-heading font-bold text-lg leading-tight">{team.name}</h2>
                <p className="text-xs text-muted-foreground">[{team.tag}]</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Điểm</p>
                <p className="text-lg font-bold text-amber-400">{team.total_points}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tổng kills</p>
                <p className="text-xl font-bold">{team.total_kills}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Thành viên</p>
                <p className="text-xl font-bold">{members.length}</p>
              </div>
            </div>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="size-3.5" /> Thành viên
              </h3>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <span className="flex-1 font-medium">{m.user?.display_name ?? m.user?.email ?? "?"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.joined_at).toLocaleDateString("vi")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite */}
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 dark:border-amber-400/30 dark:bg-amber-400/5 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-amber-400">Mời đồng đội</p>
            <p className="text-xs text-muted-foreground">Chia sẻ link để người chơi đăng ký và điền thông tin.</p>
            <button
              onClick={copyInvite}
              className="flex items-center gap-2 rounded-lg border border-primary/30 dark:border-amber-400/30 bg-background px-3 py-2 text-xs font-semibold text-primary dark:text-amber-400 hover:bg-primary/5 transition-colors w-full"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Đã copy!" : `${typeof window !== "undefined" ? window.location.origin : ""}/join`}
            </button>
          </div>

          <Link href="/tournaments">
            <Button variant="outline" className="w-full rounded-xl">
              <Trophy className="size-4 mr-2" /> Xem các giải đấu
            </Button>
          </Link>
        </div>
      )}

      {/* No team: create form */}
      {!missingSetup && !team && (
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
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tên team <span className="text-red-400">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Arex Gaming"
                required
                maxLength={40}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tag team (2–8 ký tự) <span className="text-red-400">*</span>
              </label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="vd: AREX"
                required
                minLength={2}
                maxLength={8}
                className="h-10 rounded-xl font-mono tracking-widest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                URL logo team
              </label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="logo preview"
                    className="size-12 rounded-xl object-cover border border-border shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10 rounded-xl"
                />
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
