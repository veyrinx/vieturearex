"use client";

import { cn } from "@/lib/utils";
import type { TmsMatch } from "@/lib/tms/types";

const statusDot: Record<string, string> = {
  pending:   "bg-muted-foreground/40",
  playing:   "bg-amber-400 animate-pulse",
  done:      "bg-emerald-400",
  cancelled: "bg-red-400/60",
};

function MatchCard({ match }: { match: TmsMatch }) {
  const aWon = match.winner_id === match.team_a_id;
  const bWon = match.winner_id === match.team_b_id;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden text-sm min-w-[200px]",
      match.status === "playing" ? "border-amber-400/40" : "border-border",
    )}>
      {/* Status bar */}
      <div className={cn("h-0.5", {
        "bg-muted/50": match.status === "pending",
        "bg-amber-400": match.status === "playing",
        "bg-emerald-500": match.status === "done",
        "bg-red-400/60": match.status === "cancelled",
      })} />

      {[
        { team: match.team_a, won: aWon },
        { team: match.team_b, won: bWon },
      ].map(({ team, won }, i) => (
        <div key={i} className={cn(
          "flex items-center gap-2 px-3 py-2",
          i === 0 && "border-b border-border/50",
          won && "bg-emerald-500/5",
        )}>
          {team?.logo_url
            ? <img src={team.logo_url} alt={team.name} className="size-5 rounded object-cover shrink-0" />
            : <div className="size-5 rounded bg-muted flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0">
                {team?.tag?.slice(0, 2) ?? "?"}
              </div>
          }
          <span className={cn(
            "flex-1 font-medium truncate",
            won && "text-emerald-400 font-bold",
            !team && "text-muted-foreground italic",
          )}>
            {team?.name ?? "TBD"}
          </span>
          {won && <span className="text-emerald-400 text-[10px] font-black">WIN</span>}
        </div>
      ))}

      {match.scheduled_at && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground border-t border-border/50 flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", statusDot[match.status])} />
          {new Date(match.scheduled_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

export function TournamentBracket({ matches }: { matches: TmsMatch[] }) {
  if (matches.length === 0) return null;

  // Group by round_num, keep round label from first match in group
  const roundMap = new Map<number, { label: string; matches: TmsMatch[] }>();
  for (const m of matches) {
    const existing = roundMap.get(m.round_num);
    if (existing) existing.matches.push(m);
    else roundMap.set(m.round_num, { label: m.round, matches: [m] });
  }
  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {rounds.map(([num, { label, matches: ms }]) => (
          <div key={num} className="flex flex-col gap-2 min-w-[220px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              {label}
            </p>
            <div className="flex flex-col gap-3">
              {ms.map((m: TmsMatch) => <MatchCard key={m.id} match={m} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
