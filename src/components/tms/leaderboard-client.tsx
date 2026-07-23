"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, Crown } from "lucide-react";
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

// ─── Bục vinh danh Top 3 ─────────────────────────────────────────────────────
type PodiumItem = {
  rank: number;
  name: string;
  sub?: string | null;
  points: number;
  href: string;
  logo?: string | null;
  initial: string;
};

const PODIUM_STYLE: Record<number, { grad: string; ring: string; ped: string; bar: string; medal: string; avatar: string; delay: number }> = {
  1: { grad: "from-amber-300 to-yellow-500", ring: "ring-amber-400/80", ped: "h-24", bar: "from-amber-500/40 to-amber-400/5 border-amber-400/50", medal: "🥇", avatar: "size-20", delay: 0.12 },
  2: { grad: "from-zinc-200 to-slate-400", ring: "ring-zinc-300/70", ped: "h-16", bar: "from-slate-400/30 to-slate-300/5 border-slate-300/40", medal: "🥈", avatar: "size-16", delay: 0 },
  3: { grad: "from-orange-300 to-amber-700", ring: "ring-orange-400/70", ped: "h-12", bar: "from-orange-500/30 to-orange-400/5 border-orange-400/40", medal: "🥉", avatar: "size-16", delay: 0.24 },
};

function PodiumCard({ item }: { item: PodiumItem }) {
  const s = PODIUM_STYLE[item.rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col items-center"
    >
      <div className="flex h-6 items-end">
        {item.rank === 1 && (
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="size-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          </motion.div>
        )}
      </div>
      <div className={cn("relative rounded-full bg-gradient-to-br p-0.5 shadow-lg ring-2", s.grad, s.ring)}>
        <div className={cn("overflow-hidden rounded-full bg-card", s.avatar)}>
          {item.logo ? (
            <Image src={item.logo} alt={item.name} width={80} height={80} unoptimized className="size-full object-cover" />
          ) : (
            <div className={cn("flex size-full items-center justify-center bg-gradient-to-br text-xl font-black text-white", s.grad)}>
              {item.initial}
            </div>
          )}
        </div>
        <span className="absolute -bottom-1 -right-1 text-lg drop-shadow">{s.medal}</span>
      </div>
      <Link
        href={item.href}
        className="mt-2 max-w-[92px] truncate text-center text-xs font-bold transition-colors hover:text-primary dark:hover:text-amber-400 sm:max-w-[130px] sm:text-sm"
      >
        {item.name}
      </Link>
      {item.sub && <p className="max-w-[92px] truncate text-center font-mono text-[10px] text-muted-foreground">{item.sub}</p>}
      <p className="text-sm font-black tabular-nums text-amber-400">{item.points.toLocaleString()}</p>
      <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-xl border-x border-t bg-gradient-to-t pt-2", s.bar, s.ped)}>
        <span className="font-heading text-2xl font-black text-foreground/70">{item.rank}</span>
      </div>
    </motion.div>
  );
}

function Podium({ items }: { items: PodiumItem[] }) {
  if (items.length < 3) return null;
  const byRank: Record<number, PodiumItem> = {};
  for (const it of items) byRank[it.rank] = it;
  const order = [byRank[2], byRank[1], byRank[3]].filter(Boolean) as PodiumItem[];
  return (
    <div className="flex items-end justify-center gap-2 rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-transparent p-4 sm:gap-4">
      {order.map((it) => (
        <PodiumCard key={it.rank} item={it} />
      ))}
    </div>
  );
}

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

  const top3: PodiumItem[] = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 3)
        .map((p, i) => ({
          rank: i + 1,
          name: p.display_name ?? "—",
          sub: p.ff_id,
          points: p.total_points,
          href: `/players/${p.user_id}`,
          initial: (p.display_name ?? "?").charAt(0).toUpperCase(),
        })),
    [players],
  );

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
      <Podium items={top3} />
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
          {query && <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">{filtered.length} kết quả cho &quot;{query}&quot;</p>}
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

  const top3: PodiumItem[] = useMemo(
    () =>
      [...teams]
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 3)
        .map((t, i) => ({
          rank: i + 1,
          name: t.team_name,
          sub: `[${t.team_tag}]`,
          points: t.total_points,
          href: `/teams/${t.team_id}`,
          logo: t.logo_url,
          initial: t.team_tag.slice(0, 2).toUpperCase(),
        })),
    [teams],
  );

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
      <Podium items={top3} />
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
          {query && <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">{filtered.length} kết quả cho &quot;{query}&quot;</p>}
        </div>
      )}
    </div>
  );
}
