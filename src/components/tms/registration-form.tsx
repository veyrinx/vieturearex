"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, XCircle, Users, Trophy, AlertCircle,
  UserPlus, ShieldOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type TeamMember = { id: string; display_name: string | null; ff_id: string | null; avatar_url: string | null };

type Props = {
  tournament: {
    id: string;
    name: string;
    slug: string;
    mode: string;
    teamSize: number;
    maxTeams: number;
    prizePool: string | null;
    registrationCloseAt: string | null;
  };
  team: { id: string; name: string; tag: string; captain_id: string; members: TeamMember[] } | null;
  userEmail: string;
  existingReg: { id: string; status: string } | null;
};

function StatusCard({ reg }: { reg: { id: string; status: string } }) {
  if (reg.status === "approved") return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
      <CheckCircle2 className="size-10 mx-auto text-emerald-400" />
      <p className="font-semibold text-emerald-400">Team bạn đã được duyệt!</p>
      <p className="text-sm text-muted-foreground">Chúc bạn thi đấu tốt.</p>
    </div>
  );

  if (reg.status === "pending") return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-2">
      <Clock className="size-10 mx-auto text-amber-400" />
      <p className="font-semibold text-amber-400">Đang chờ admin duyệt</p>
      <p className="text-sm text-muted-foreground">Chúng tôi sẽ thông báo khi đăng ký được xử lý.</p>
    </div>
  );

  if (reg.status === "rejected") return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-2">
      <XCircle className="size-10 mx-auto text-red-400" />
      <p className="font-semibold text-red-400">Đăng ký bị từ chối</p>
      <p className="text-sm text-muted-foreground">Liên hệ admin để biết thêm chi tiết.</p>
    </div>
  );

  return null;
}

export function RegistrationForm({ tournament, team, userEmail, existingReg }: Props) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!team || !agreed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tms/tournaments/${tournament.id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ team_id: team.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Đăng ký thất bại.");
        return;
      }
      toast.success("Đã gửi đăng ký! Vui lòng chờ admin duyệt.");
      router.push(`/tournaments/${tournament.slug}`);
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Show existing status
  if (existingReg) {
    return (
      <div className="space-y-4">
        <StatusCard reg={existingReg} />
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="block text-center text-sm text-primary dark:text-amber-400 hover:underline"
        >
          Quay lại trang giải đấu →
        </Link>
      </div>
    );
  }

  // No team
  if (!team) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-4">
        <Users className="size-10 mx-auto text-muted-foreground/40" />
        <div>
          <p className="font-semibold">Bạn chưa có team</p>
          <p className="text-sm text-muted-foreground mt-1">Tạo hoặc gia nhập team trước khi đăng ký giải đấu.</p>
        </div>
        <Link href="/tournaments/my-team">
          <Button className="rounded-xl gap-1.5">
            <Users className="size-4" /> Quản lý team
          </Button>
        </Link>
      </div>
    );
  }

  const isCaptain = true;

  return (
    <div className="space-y-6">
      {/* Tournament info */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Trophy className="size-4 text-primary dark:text-amber-400" /> Thông tin giải đấu
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Giải đấu</p>
            <p className="font-semibold">{tournament.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Mode</p>
            <p className="font-semibold">{tournament.mode}</p>
          </div>
          {tournament.prizePool && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Giải thưởng</p>
              <p className="font-semibold text-amber-400">{tournament.prizePool}</p>
            </div>
          )}
          {tournament.registrationCloseAt && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Deadline</p>
              <p className="font-semibold text-rose-400">
                {format(new Date(tournament.registrationCloseAt), "dd/MM/yyyy HH:mm", { locale: vi })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Team info */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Users className="size-4 text-primary dark:text-amber-400" />
          [{team.tag}] {team.name}
        </h2>
        <div className="space-y-2">
          {team.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="size-8 rounded-lg object-cover border border-border shrink-0" />
              ) : (
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary dark:text-amber-400 shrink-0">
                  {(m.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{m.display_name ?? "Chưa đặt tên"}</p>
                {m.ff_id && <p className="text-[11px] font-mono text-amber-400">{m.ff_id}</p>}
              </div>
            </div>
          ))}
        </div>
        {team.members.length < tournament.teamSize && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            Team chưa đủ {tournament.teamSize} thành viên. Bạn vẫn có thể đăng ký, nhưng hãy bổ sung trước khi giải bắt đầu.
          </div>
        )}
      </div>

      {/* Agreement + submit */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span className="text-sm text-muted-foreground">
            Tôi xác nhận thông tin team chính xác và đồng ý với{" "}
            <span className="text-foreground font-medium">luật thi đấu</span> của giải. Xác nhận đăng ký sẽ gửi thông báo đến email <span className="text-foreground">{userEmail}</span>.
          </span>
        </label>

        <Button
          onClick={handleRegister}
          disabled={!agreed || submitting}
          className="w-full rounded-xl gap-1.5 h-11"
        >
          <UserPlus className="size-4" />
          {submitting ? "Đang đăng ký..." : `Đăng ký [${team.tag}] ${team.name}`}
        </Button>
      </div>
    </div>
  );
}
