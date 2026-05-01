import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Users, CalendarDays, Swords } from "lucide-react";
import { getTmsTournaments } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Giải Đấu | Arex",
  description: "Tất cả giải đấu Free Fire trên hệ thống Arex — đăng ký, thi đấu, bảng xếp hạng.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusColor: Record<string, string> = {
  registering: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  ongoing: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  finished: "border-muted-foreground/30 bg-muted text-muted-foreground",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-400",
  draft: "border-border bg-muted text-muted-foreground",
};

export default async function TournamentsPage() {
  const tournaments = await getTmsTournaments(false).catch(() => []);

  return (
    <div className="py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Trophy className="size-7 text-amber-400" />
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">Giải Đấu</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tournament Management System — Arex</p>
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
                  <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wider border rounded-md px-1.5 py-0.5", statusColor[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="mt-auto pt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[t.mode]}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />Max {t.max_teams} teams</span>
                  <span className="flex items-center gap-1"><CalendarDays className="size-3" />{FORMAT_LABELS[t.format]}</span>
                </div>
                {t.prize_pool && (
                  <p className="text-xs font-bold text-amber-400">🏆 {t.prize_pool}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
