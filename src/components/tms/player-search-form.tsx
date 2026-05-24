"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Player = { id: string; display_name: string | null; avatar_url: string | null; ff_id: string | null };

function usePlayerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = (await res.json()) as { players: Player[] };
          setResults(data.players ?? []);
        }
      } catch { /* non-fatal */ } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { query, setQuery, results, loading };
}

function PlayerPicker({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: Player | null;
  onSelect: (p: Player | null) => void;
}) {
  const { query, setQuery, results, loading } = usePlayerSearch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        {value.avatar_url ? (
          <img src={value.avatar_url} alt="" className="size-9 rounded-lg object-cover border border-border" />
        ) : (
          <div className="size-9 rounded-lg bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center text-sm font-black text-primary dark:text-amber-400">
            {(value.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{value.display_name ?? "—"}</p>
          {value.ff_id && <p className="text-[11px] font-mono text-amber-400">{value.ff_id}</p>}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={label}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/60"
        />
      </div>
      {open && (query.length >= 2) && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Đang tìm...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Không tìm thấy.</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
              onClick={() => { onSelect(p); setOpen(false); setQuery(""); }}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="size-8 rounded-lg object-cover border border-border shrink-0" />
              ) : (
                <div className="size-8 rounded-lg bg-primary/10 dark:bg-amber-400/10 flex items-center justify-center text-xs font-black text-primary dark:text-amber-400 shrink-0">
                  {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{p.display_name ?? "—"}</p>
                {p.ff_id && <p className="text-[11px] font-mono text-muted-foreground">{p.ff_id}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerSearchForm({ currentA, currentB }: { currentA?: string; currentB?: string }) {
  const router = useRouter();
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);

  const compare = useCallback(() => {
    if (!playerA || !playerB) return;
    router.push(`/players/compare?a=${playerA.id}&b=${playerB.id}`);
  }, [playerA, playerB, router]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <PlayerPicker label="Tìm tuyển thủ A..." value={playerA} onSelect={setPlayerA} />
        <PlayerPicker label="Tìm tuyển thủ B..." value={playerB} onSelect={setPlayerB} />
      </div>
      <Button
        onClick={compare}
        disabled={!playerA || !playerB}
        className="w-full gap-1.5 rounded-xl"
      >
        <Search className="size-4" />
        So sánh
      </Button>
      {(currentA || currentB) && (
        <p className="text-[11px] text-center text-muted-foreground">
          Chọn tuyển thủ mới để thay thế so sánh hiện tại.
        </p>
      )}
    </div>
  );
}
