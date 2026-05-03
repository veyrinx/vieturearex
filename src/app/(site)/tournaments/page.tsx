import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Users, CalendarDays, Swords, Shield, Plus, UserPlus, Zap } from "lucide-react";
import { getTmsTournaments } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { getAuthContext } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Giải Đấu | Arex",
  description: "Tất cả giải đấu Free Fire trên hệ thống Arex — đăng ký, thi đấu, bảng xếp hạng.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusColor: Record<string, string> = {
  registering: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  ongoing:     "border-amber-500/40 bg-amber-500/10 text-amber-400",
  finished:    "border-muted-foreground/30 bg-muted text-muted-foreground",
  cancelled:   "border-red-500/30 bg-red-500/10 text-red-400",
  draft:       "border-border bg-muted text-muted-foreground",
};

const ADMIN_ROLES = ["super_admin", "admin", "it", "manager"];

export default async function TournamentsPage() {
  const [tournaments, auth] = await Promise.all([
    getTmsTournaments(false).catch(() => []),
    getAuthContext().catch(() => ({ userId: null, role: "user" })),
  ]);

  const isAdmin = ADMIN_ROLES.includes(auth.role ?? "");
  const isLoggedIn = !!auth.userId;

  return (
    <div className="py-10 space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Trophy className="size-7 text-amber-400" />
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">Giải Đấu</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Tournament Management System — Arex</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Link
              href="/admin/tms"
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-400 hover:border-amber-500/60 transition-colors"
            >
              <Plus className="size-4" /> Tạo giải đấu
            </Link>
          )}
          {isLoggedIn && !isAdmin && (
            <Link
              href="/tournaments/propose"
              className="flex items-center gap-2 rounded-xl border border-primary/30 dark:border-amber-400/30 bg-primary/5 dark:bg-amber-400/5 px-4 py-2.5 text-sm font-bold text-primary dark:text-amber-400 hover:border-primary/60 dark:hover:border-amber-400/60 transition-colors"
            >
              <UserPlus className="size-4" /> Đề xuất giải đấu
            </Link>
          )}
          <Link
            href="/tournaments/my-team"
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors"
          >
            <Shield className="size-4" /> Team của tôi
          </Link>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          Chưa có giải đấu nào.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.slug}`}
              className="group rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex flex-col">
              {t.banner_url ? (
                <div className="aspect-[16/7] overflow-hidden bg-muted">
                  <img src={t.banner_url} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="aspect-[16/7] bg-gradient-to-br from-amber-500/20 to-primary/10 flex items-center justify-center">
                  <Trophy className="size-10 text-amber-400/40" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading font-bold text-base leading-tight group-hover:text-primary transition-colors">{t.name}</h2>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider border rounded-md px-1.5 py-0.5", statusColor[t.status])}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    {t.auto_approve_registrations && t.status === "registering" && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
                        <Zap className="size-2.5" /> Tự duyệt
                      </span>
                    )}
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="mt-auto pt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[t.mode]}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />Max {t.max_teams} teams</span>
                  <span className="flex items-center gap-1"><CalendarDays className="size-3" />{FORMAT_LABELS[t.format]}</span>
                </div>
                {t.prize_pool && <p className="text-xs font-bold text-amber-400">🏆 {t.prize_pool}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
