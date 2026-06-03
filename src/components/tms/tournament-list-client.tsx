"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Swords, Users, CalendarDays, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TmsServerBadge } from "@/components/tms/server-badge";
import { TournamentBanner } from "@/components/common/safe-image";
import type { TmsServer } from "@/lib/tms/types";

type Tournament = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  status: string;
  server: string;
  mode: string;
  format: string;
  max_teams: number;
  prize_pool: string | null;
  auto_approve_registrations: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  registering: "Đăng ký",
  ongoing:     "Đang diễn ra",
  finished:    "Kết thúc",
  cancelled:   "Huỷ",
  draft:       "Nháp",
};

const MODE_LABELS: Record<string, string> = {
  "1v1": "1v1", "2v2": "2v2", "4v4": "4v4", squad: "Squad",
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
  round_robin: "Round Robin",
  swiss: "Swiss",
};

const statusColor: Record<string, string> = {
  registering: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  ongoing:     "border-amber-500/40 bg-amber-500/10 text-amber-400",
  finished:    "border-muted-foreground/30 bg-muted text-muted-foreground",
  cancelled:   "border-red-500/30 bg-red-500/10 text-red-400",
  draft:       "border-border bg-muted text-muted-foreground",
};

export function TournamentListClient({
  tournaments,
  emptyMessage,
}: {
  tournaments: Tournament[];
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.prize_pool ?? "").toLowerCase().includes(q),
    );
  }, [tournaments, query]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm giải đấu..."
          className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none dark:focus:border-amber-400"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-muted-foreground">{filtered.length} kết quả cho &quot;{query}&quot;</p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          {query ? `Không tìm thấy giải đấu nào khớp với "${query}"` : emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.slug}`}
              className="group rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex flex-col">
              <div className="relative aspect-[16/7] overflow-hidden bg-muted">
                <TournamentBanner src={t.banner_url} alt={t.name} className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading font-bold text-base leading-tight group-hover:text-primary transition-colors">{t.name}</h2>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider border rounded-md px-1.5 py-0.5", statusColor[t.status])}>
                      {STATUS_LABELS[t.status] ?? t.status}
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
                  <TmsServerBadge server={t.server as TmsServer} variant="full" />
                  <span className="flex items-center gap-1"><Swords className="size-3" />{MODE_LABELS[t.mode] ?? t.mode}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />Max {t.max_teams}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="size-3" />{FORMAT_LABELS[t.format] ?? t.format}</span>
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
