"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Player = {
  user_id: string;
  display_name: string | null;
  ff_id: string | null;
  team_name: string;
  total_points: number;
  total_kills: number;
  kd_ratio: number;
  wins: number;
  matches_played: number;
};

type Team = {
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url: string | null;
  total_points: number;
  total_kills: number;
  wins: number;
  matches_played: number;
  tournaments_played: number;
};

type SortDir = "asc" | "desc";

const medals = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-base leading-none">{medals[rank - 1]}</span>;
  return <span className="w-6 text-center text-xs font-mono font-bold text-muted-foreground">{rank}</span>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-30" />;
  return dir === "asc"
    ? <ChevronUp className="size-3 text-primary dark:text-amber-400" />
    : <ChevronDown className="size-3 text-primary dark:text-amber-400" />;
}

function SortableHeader({ label, col, sort, dir, onSort, className }: {
  label: string; col: string; sort: string; dir: SortDir;
  onSort: (col: string) => void; className?: string;
}) {
  return (
    <th
      onClick={() => onSort(col)}
      className={cn("px-3 py-2 cursor-pointer select-none hover:text-foreground transition-colors", className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={sort === col} dir={dir} />
      </span>
    </th>
  );
}

export function PlayerLeaderboardClient({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("total_points");
  const [dir, setDir] = useState<SortDir>("desc");

  const handleSort = (col: string) => {
    if (sort === col) setDir((d) => d === "desc" ? "asc" : "desc");
    else { setSort(col); setDir("desc"); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? players.filter((p) =>
          (p.display_name ?? "").toLowerCase().includes(q) ||
          (p.ff_id ?? "").toLowerCase().includes(q) ||
          p.team_name.toLowerCase().includes(q),
        )
      : players;

    return [...list].sort((a, b) => {
      let va = 0, vb = 0;
      if (sort === "total_points") { va = a.total_points; vb = b.total_points; }
      else if (sort === "total_kills") { va = a.total_kills; vb = b.total_kills; }
      else if (sort === "kd_ratio") { va = a.kd_ratio; vb = b.kd_ratio; }
      else if (sort === "win_rate") {
        va = a.matches_played > 0 ? a.wins / a.matches_played : 0;
        vb = b.matches_played > 0 ? b.wins / b.matches_played : 0;
      }
      else if (sort === "matches_played") { va = a.matches_played; vb = b.matches_played; }
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [players, query, sort, dir]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tuyển thủ, FF ID, tên đội..."
          className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none dark:focus:border-amber-400"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy tuyển thủ nào
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Tuyển thủ</th>
                <SortableHeader label="Điểm" col="total_points" sort={sort} dir={dir} onSort={handleSort} className="text-right" />
                <SortableHeader label="Kills" col="total_kills" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden sm:table-cell" />
                <SortableHeader label="K/D" col="kd_ratio" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden sm:table-cell" />
                <SortableHeader label="Thắng%" col="win_rate" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden md:table-cell" />
                <SortableHeader label="Trận" col="matches_played" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const rank = i + 1;
                const winRate = p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;
                return (
                  <tr key={p.user_id}
                    className={cn(
                      "border-t border-border/60 hover:bg-muted/10 transition-colors",
                      !query && rank === 1 && "bg-amber-500/5",
                      !query && rank === 2 && "bg-zinc-500/5",
                      !query && rank === 3 && "bg-orange-500/5",
                    )}>
                    <td className="px-3 py-2.5"><RankBadge rank={rank} /></td>
                    <td className="px-3 py-2.5">
                      <Link href={`/players/${p.user_id}`} className="font-semibold hover:text-primary dark:hover:text-amber-400 transition-colors block truncate max-w-[130px]">
                        {p.display_name ?? "—"}
                      </Link>
                      {p.ff_id && <p className="text-[10px] text-muted-foreground font-mono">{p.ff_id}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-400 tabular-nums">{p.total_points.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums hidden sm:table-cell">{p.total_kills.toLocaleString()}</td>
                    <td className={cn("px-3 py-2.5 text-right text-xs font-mono hidden sm:table-cell",
                      p.kd_ratio >= 3 ? "text-emerald-400" : p.kd_ratio >= 1.5 ? "text-amber-400" : "text-muted-foreground"
                    )}>{p.kd_ratio}</td>
                    <td className={cn("px-3 py-2.5 text-right text-xs font-semibold tabular-nums hidden md:table-cell",
                      winRate >= 60 ? "text-emerald-400" : winRate >= 40 ? "text-amber-400" : "text-muted-foreground"
                    )}>{winRate}%</td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums hidden md:table-cell">{p.matches_played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {query && <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">{filtered.length} kết quả cho "{query}"</p>}
        </div>
      )}
    </div>
  );
}

export function TeamLeaderboardClient({ teams }: { teams: Team[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("total_points");
  const [dir, setDir] = useState<SortDir>("desc");

  const handleSort = (col: string) => {
    if (sort === col) setDir((d) => d === "desc" ? "asc" : "desc");
    else { setSort(col); setDir("desc"); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? teams.filter((t) =>
          t.team_name.toLowerCase().includes(q) ||
          t.team_tag.toLowerCase().includes(q),
        )
      : teams;

    return [...list].sort((a, b) => {
      let va = 0, vb = 0;
      if (sort === "total_points") { va = a.total_points; vb = b.total_points; }
      else if (sort === "total_kills") { va = a.total_kills; vb = b.total_kills; }
      else if (sort === "win_rate") {
        va = a.matches_played > 0 ? a.wins / a.matches_played : 0;
        vb = b.matches_played > 0 ? b.wins / b.matches_played : 0;
      }
      else if (sort === "tournaments_played") { va = a.tournaments_played; vb = b.tournaments_played; }
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [teams, query, sort, dir]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên đội, tag..."
          className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none dark:focus:border-amber-400"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy đội nào
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Đội</th>
                <SortableHeader label="Điểm" col="total_points" sort={sort} dir={dir} onSort={handleSort} className="text-right" />
                <SortableHeader label="Kills" col="total_kills" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden sm:table-cell" />
                <SortableHeader label="Thắng%" col="win_rate" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden sm:table-cell" />
                <SortableHeader label="Giải" col="tournaments_played" sort={sort} dir={dir} onSort={handleSort} className="text-right hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const rank = i + 1;
                const winRate = t.matches_played > 0 ? Math.round((t.wins / t.matches_played) * 100) : 0;
                return (
                  <tr key={t.team_id}
                    className={cn(
                      "border-t border-border/60 hover:bg-muted/10 transition-colors",
                      !query && rank === 1 && "bg-amber-500/5",
                      !query && rank === 2 && "bg-zinc-500/5",
                      !query && rank === 3 && "bg-orange-500/5",
                    )}>
                    <td className="px-3 py-2.5"><RankBadge rank={rank} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {t.logo_url
                          ? <Image src={t.logo_url} alt={t.team_name} width={24} height={24} unoptimized className="size-6 rounded object-cover shrink-0" />
                          : <div className="size-6 rounded bg-muted flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0">{t.team_tag.slice(0, 2)}</div>
                        }
                        <div className="min-w-0">
                          <Link href={`/teams/${t.team_id}`} className="font-semibold hover:text-primary dark:hover:text-amber-400 transition-colors block truncate max-w-[110px]">
                            {t.team_name}
                          </Link>
                          <p className="text-[9px] text-muted-foreground font-mono">[{t.team_tag}]</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-400 tabular-nums">{t.total_points.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums hidden sm:table-cell">{t.total_kills.toLocaleString()}</td>
                    <td className={cn("px-3 py-2.5 text-right text-xs font-semibold hidden sm:table-cell",
                      winRate >= 60 ? "text-emerald-400" : winRate >= 40 ? "text-amber-400" : "text-muted-foreground"
                    )}>{winRate}%</td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums hidden md:table-cell">{t.tournaments_played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {query && <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">{filtered.length} kết quả cho "{query}"</p>}
        </div>
      )}
    </div>
  );
}
