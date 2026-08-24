"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Users, Shield, AlertTriangle, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Team = { id: string; name: string; tag: string; logo_url: string | null; total_points: number; total_kills: number };
type Profile = { id: string; display_name: string | null; ff_id: string | null };
type Member = { id: string; user_id: string; joined_at: string; user?: { display_name: string | null } };

export default function TeamJoinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null | "loading">("loading");
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [members, setMembers] = useState<Member[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null | "loading">("loading");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/tms/teams/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((t: Team | null) => {
        setTeam(t);
        if (t) {
          fetch(`/api/tms/teams/${id}/members`)
            .then((r) => (r.ok ? r.json() : []))
            .then((ms: Member[]) => setMembers(ms ?? []))
            .catch(() => {});
        }
      })
      .catch(() => setTeam(null));

    fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => setProfile(p))
      .catch(() => setProfile(null));

    fetch("/api/tms/teams?mine=true", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((t: Team | null) => setMyTeam(t))
      .catch(() => setMyTeam(null));
  }, [id]);

  const onJoin = async () => {
    const p = profile as Profile;
    if (!p?.ff_id || !p?.display_name) {
      router.push(`/setup?need=ff&next=/teams/${id}/join`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/tms/teams/${id}/join`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.error === "setup_required") {
        router.push(`/setup?need=ff&next=/teams/${id}/join`);
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Lỗi tham gia team."); return; }
      toast.success("Đã tham gia team!");
      setJoined(true);
      setMyTeam(team as Team);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setJoining(false);
    }
  };

  if (team === "loading" || profile === "loading" || myTeam === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="py-16 text-center space-y-3">
        <Users className="mx-auto size-10 text-muted-foreground" />
        <p className="text-muted-foreground">Team không tồn tại hoặc link không hợp lệ.</p>
        <Link href="/tournaments"><Button variant="outline" className="rounded-xl">Xem giải đấu</Button></Link>
      </div>
    );
  }

  const p = profile as Profile | null;
  const alreadyInThisTeam = (myTeam as Team | null)?.id === team.id || joined;
  const inOtherTeam = myTeam && (myTeam as Team).id !== team.id && !joined;

  return (
    <div className="py-10 max-w-lg mx-auto space-y-6">
      {/* Team card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          {team.logo_url
            ? <img src={team.logo_url} alt={team.name} className="size-16 rounded-2xl object-cover border border-border" />
            : <div className="size-16 rounded-2xl bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center text-xl font-black text-primary dark:text-amber-400">{team.tag.slice(0, 2)}</div>
          }
          <div>
            <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em]">{team.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">[{team.tag}]</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Điểm", value: team.total_points },
            { label: "Kills", value: team.total_kills },
            { label: "Thành viên", value: members.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>

        {members.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Thành viên hiện tại</p>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <span key={m.id} className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs font-medium">
                  {m.user?.display_name ?? "?"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action section */}
      {joined || alreadyInThisTeam ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center space-y-3">
          <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
          <p className="font-bold text-emerald-400">Bạn đã là thành viên của team này!</p>
          <Link href="/tournaments/my-team">
            <Button className="rounded-xl w-full">Xem team của tôi</Button>
          </Link>
        </div>
      ) : !p ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="text-center space-y-1">
            <p className="font-heading font-bold uppercase tracking-widest">Đăng nhập để tham gia</p>
            <p className="text-xs text-muted-foreground">Bạn cần tài khoản và FF ID để gia nhập team</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/login?next=/teams/${id}/join`}>
              <Button variant="outline" className="w-full rounded-xl gap-2">
                <LogIn className="size-4" /> Đăng nhập
              </Button>
            </Link>
            <Link href={`/register?next=/teams/${id}/join`}>
              <Button className="w-full rounded-xl gap-2">
                <UserPlus className="size-4" /> Đăng ký
              </Button>
            </Link>
          </div>
        </div>
      ) : !p.ff_id || !p.display_name ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400 text-sm">Cần thiết lập tài khoản</p>
              <p className="text-xs text-muted-foreground mt-1">Bạn cần có tên hiển thị và FF ID trước khi gia nhập team.</p>
            </div>
          </div>
          <Link href={`/setup?need=ff&next=/teams/${id}/join`}>
            <Button className="w-full rounded-xl">Thiết lập ngay</Button>
          </Link>
        </div>
      ) : inOtherTeam ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Bạn đang ở team khác</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bạn đang là thành viên của <strong>{(myTeam as Team).name}</strong>. Rời team hiện tại trước khi tham gia team mới.
              </p>
            </div>
          </div>
          <Link href="/tournaments/my-team">
            <Button variant="outline" className="w-full rounded-xl">Quản lý team của tôi</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/20 dark:border-amber-400/20 bg-card p-5 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="size-9 rounded-lg bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center">
              <Shield className="size-4 text-primary dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{p.display_name}</p>
              <p className="text-xs font-mono text-amber-400">FF: {p.ff_id}</p>
            </div>
          </div>
          <Button
            onClick={() => void onJoin()}
            disabled={joining}
            className={cn("w-full h-11 rounded-xl font-bold text-base")}
          >
            {joining ? "Đang tham gia..." : `Tham gia ${team.name}`}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Bạn sẽ được thêm vào team ngay lập tức.
          </p>
        </div>
      )}
    </div>
  );
}
