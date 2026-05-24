"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Clock, CheckCircle2, XCircle, LogIn, Users, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Team = { id: string; name: string; tag: string; captain_id: string };
type Profile = { id: string; display_name: string | null; ff_id: string | null };
type Reg = { id: string; team_id: string; status: "pending" | "approved" | "rejected" };

export function RegisterButton({
  tournamentId,
  tournamentStatus,
  slug,
}: {
  tournamentId: string;
  tournamentStatus: string;
  slug: string;
}) {
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [team, setTeam] = useState<Team | null | "loading">("loading");
  const [reg, setReg] = useState<Reg | null | "loading">("loading");

  useEffect(() => {
    const profileP = fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<Profile | null>;
    const teamP = fetch("/api/tms/teams?mine=true", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<Team | null>;
    const regsP = fetch(`/api/tms/tournaments/${tournamentId}/registrations`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : [])).catch(() => []) as Promise<Reg[]>;

    void Promise.all([profileP, teamP, regsP]).then(([p, t, regs]) => {
      setProfile(p);
      setTeam(t);
      const found = t ? regs.find((r) => r.team_id === t.id) ?? null : null;
      setReg(found);
    });
  }, [tournamentId]);

  if (tournamentStatus !== "registering") return null;
  if (profile === "loading" || team === "loading" || reg === "loading") return null;

  if (!profile) {
    return (
      <Link href={`/login?next=/tournaments/${slug}`}>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-lg">
          <LogIn className="size-3.5" /> Đăng nhập để đăng ký
        </Button>
      </Link>
    );
  }

  if (!team) {
    return (
      <Link href="/tournaments/my-team">
        <Button size="sm" variant="outline" className="gap-1.5 rounded-lg">
          <Users className="size-3.5" /> Tạo team để đăng ký
        </Button>
      </Link>
    );
  }

  const t = team as Team;
  const p = profile as Profile;
  if (t.captain_id !== p.id) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <ShieldOff className="size-3.5" /> Chỉ captain mới đăng ký được
      </span>
    );
  }

  if (reg) {
    const r = reg as Reg;
    if (r.status === "approved") return (
      <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="size-3.5" /> Đã được duyệt
      </span>
    );
    if (r.status === "pending") return (
      <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
        <Clock className="size-3.5" /> Đang chờ duyệt
      </span>
    );
    if (r.status === "rejected") return (
      <span className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
        <XCircle className="size-3.5" /> Bị từ chối
      </span>
    );
  }

  return (
    <Link href={`/tournaments/${slug}/register`}>
      <Button size="sm" className="gap-1.5 rounded-lg">
        <UserPlus className="size-3.5" />
        Đăng ký tham dự
      </Button>
    </Link>
  );
}
