"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, Newspaper, Filter, X, SlidersHorizontal, Clock, TrendingUp, Flame, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 8;

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as string[]; } catch { return []; }
}
function saveHistory(q: string) {
  const prev = getHistory().filter((s) => s !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}
function clearHistory() { localStorage.removeItem(HISTORY_KEY); }

type SearchResult = {
  type: "event" | "news";
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  status?: string;
  category?: string;
  slug?: string;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "event" | "news">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHistory(getHistory()); }, []);

  const doSearch = async (q: string, type: "all" | "event" | "news" = filter) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), type, limit: "40" });
      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json() as { results: SearchResult[] };
        setResults(data.results ?? []);
        if (data.results?.length) { saveHistory(q.trim()); setHistory(getHistory()); }
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  // Debounce real-time search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void doSearch(query); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Re-search when type filter changes
  useEffect(() => {
    if (query.trim().length >= 2) void doSearch(query, filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (initialQuery) void doSearch(initialQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (new Date(r.date) > to) return false;
      }
      return true;
    });
  }, [results, category, dateFrom, dateTo]);

  const hasActiveAdvanced = Boolean(dateFrom || dateTo || category !== "all");
  const clearAdvanced = () => { setDateFrom(""); setDateTo(""); setCategory("all"); };

  return (
    <div className="space-y-6 pt-6 md:pt-8">
      <SectionHeading title="Tìm kiếm" description="Tìm kiếm sự kiện, tin tức trong hệ thống Arex." />

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); void doSearch(query); }} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="h-12 rounded-xl pl-10 text-sm"
              autoFocus
            />
            {/* Search history dropdown */}
            {showHistory && !query && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tìm gần đây</span>
                  <button type="button" onClick={() => { clearHistory(); setHistory([]); }} className="text-[10px] text-muted-foreground hover:text-foreground">Xóa</button>
                </div>
                {history.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onMouseDown={() => { setQuery(h); void doSearch(h); setShowHistory(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                  >
                    <Clock size={13} className="text-muted-foreground shrink-0" />
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" className="h-12 rounded-xl px-6" disabled={loading}>
            {loading ? "Đang tìm..." : "TÌM KIẾM"}
          </Button>
        </form>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          {(["all", "event", "news"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                filter === f
                  ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? "TẤT CẢ" : f === "event" ? "SỰ KIỆN" : "TIN TỨC"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase transition ${
              showAdvanced || hasActiveAdvanced
                ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            NÂNG CAO
            {hasActiveAdvanced && <span className="ml-1 size-1.5 rounded-full bg-current" />}
          </button>
          {results.length > 0 && (
            <span className="text-xs text-muted-foreground">{filtered.length} kết quả</span>
          )}
        </div>

        {showAdvanced && (
          <div className="grid gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Từ ngày</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-lg text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Đến ngày</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-lg text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chuyên mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                <option value="all">Tất cả</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {hasActiveAdvanced && (
              <button
                type="button"
                onClick={clearAdvanced}
                className="col-span-full inline-flex items-center justify-center gap-1 self-end rounded-lg border border-border/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <X className="size-3" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="size-10 shrink-0 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex gap-1.5">
                    <div className="h-4 w-16 rounded bg-muted" />
                    <div className="h-4 w-12 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-3/5 rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((result) => (
            <Link key={`${result.type}-${result.id}`} href={result.href}>
              <div className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    result.type === "event" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                  }`}>
                    {result.type === "event" ? <Calendar className="size-5" /> : <Newspaper className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        result.type === "event" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                      }`}>
                        {result.type === "event" ? "SỰ KIỆN" : "TIN TỨC"}
                      </span>
                      {result.status && (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary dark:text-amber-400">
                          {result.status}
                        </span>
                      )}
                      {result.category && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {result.category}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-heading text-sm font-bold text-foreground line-clamp-1">{result.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{result.description}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {new Date(result.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 40 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Hiển thị 40 kết quả đầu — hãy thu hẹp từ khóa để tìm chính xác hơn
            </p>
          )}
        </div>
      )}

      {/* No results */}
      {!loading && query.trim().length >= 2 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Search className="mx-auto size-10 text-muted-foreground/30" />
          <p className="mt-3 font-heading text-sm font-bold uppercase text-muted-foreground">KHÔNG TÌM THẤY KẾT QUẢ</p>
          <p className="mt-1 text-xs text-muted-foreground">Thử tìm với từ khóa khác hoặc bỏ bộ lọc</p>
          {hasActiveAdvanced && (
            <button
              type="button"
              onClick={clearAdvanced}
              className="mt-3 text-xs text-primary hover:underline dark:text-amber-400"
            >
              Bỏ bộ lọc nâng cao
            </button>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!loading && query.trim().length < 2 && (
        <div className="rounded-2xl border border-border bg-card p-8">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Gợi ý tìm kiếm
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { icon: Flame, label: "Sự kiện đang diễn ra", q: "sự kiện", color: "text-orange-500 bg-orange-500/10" },
              { icon: Trophy, label: "Giải đấu Free Fire", q: "giải đấu", color: "text-amber-500 bg-amber-500/10" },
              { icon: TrendingUp, label: "Tin tức mới nhất", q: "update", color: "text-blue-500 bg-blue-500/10" },
            ].map(({ icon: Icon, label, q, color }) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuery(q); void doSearch(q); }}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left transition hover:bg-muted"
              >
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
