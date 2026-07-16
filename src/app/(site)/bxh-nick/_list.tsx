"use client";

import { useMemo, useState } from "react";
import { Crown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type NickRow = {
  ff_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  tier: string | null;
};

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-600"];

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function NickList({ rows }: { rows: NickRow[] }) {
  const [query, setQuery] = useState("");

  // Giữ số hạng thật theo vị trí gốc, chỉ lọc hiển thị.
  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return ranked;
    return ranked.filter((r) => {
      const name = r.display_name || (r.ff_id ? `FF ${r.ff_id}` : "Người chơi");
      return norm(name).includes(q) || (r.ff_id ?? "").includes(q);
    });
  }, [ranked, query]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc ID Free Fire…"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy nick nào khớp “{query}”.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const i = r.rank - 1;
            const name = r.display_name || (r.ff_id ? `FF ${r.ff_id}` : "Người chơi");
            return (
              <div key={r.rank} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", i < 3 ? "border-primary/40" : "border-border")}>
                <span className={cn("flex w-8 shrink-0 justify-center font-heading text-lg font-black", i < 3 ? MEDAL[i] : "text-muted-foreground")}>
                  {i < 3 ? <Crown className="size-5" /> : r.rank}
                </span>
                <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm font-black text-muted-foreground">{name.slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground">{name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.ff_id ? `ID: ${r.ff_id}` : ""}{r.ff_id && r.tier ? " · " : ""}{r.tier ?? ""}
                  </p>
                </div>
                <span className="shrink-0 font-heading text-lg font-black tabular-nums text-primary">{r.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
