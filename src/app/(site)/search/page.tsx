"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, Newspaper, Filter, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";

type SearchResult = {
  type: "event" | "news";
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  status?: string;
  category?: string;
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

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);

    try {
      const [eventsRes, newsRes] = await Promise.all([
        fetch("/api/events").then((r) => r.json()).catch(() => ({ events: [] })),
        fetch("/api/news").then((r) => r.json()).catch(() => ({ news: [] })),
      ]);

      const lower = q.toLowerCase();
      const eventResults: SearchResult[] = (eventsRes.events || [])
        .filter((e: { title: string; description: string }) =>
          e.title.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower))
        .map((e: { id: string; title: string; description: string; start_date: string; status: string }) => ({
          type: "event" as const,
          id: e.id,
          title: e.title,
          description: e.description.slice(0, 120),
          date: e.start_date,
          href: "/events",
          status: e.status,
        }));

      const newsResults: SearchResult[] = (newsRes.news || [])
        .filter((n: { title: string; excerpt: string }) =>
          n.title.toLowerCase().includes(lower) || n.excerpt.toLowerCase().includes(lower))
        .map((n: { id: string; title: string; excerpt: string; created_at: string; slug: string; category: string }) => ({
          type: "news" as const,
          id: n.id,
          title: n.title,
          description: n.excerpt.slice(0, 120),
          date: n.created_at,
          href: `/news/${n.slug}`,
          category: n.category,
        }));

      setResults([...eventResults, ...newsResults]);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (category !== "all" && r.category !== category) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(r.date) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (new Date(r.date) > to) return false;
      }
      return true;
    });
  }, [results, filter, category, dateFrom, dateTo]);

  const hasActiveAdvanced = Boolean(dateFrom || dateTo || category !== "all");
  const clearAdvanced = () => { setDateFrom(""); setDateTo(""); setCategory("all"); };

  return (
    <div className="space-y-6 pt-6 md:pt-8">
      <SectionHeading title="Tìm kiếm" description="Tìm kiếm sự kiện, tin tức trong hệ thống Arex." />

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); doSearch(query); }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="h-12 rounded-xl pl-10 text-sm"
            />
          </div>
          <Button type="submit" className="h-12 rounded-xl px-6" disabled={loading}>
            {loading ? "Đang tìm..." : "TÌM KIẾM"}
          </Button>
        </form>

        {/* Filter */}
        <div className="flex items-center gap-2">
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
            <span className="text-xs text-muted-foreground">
              {filtered.length} kết quả
            </span>
          )}
        </div>

        {showAdvanced && (
          <div className="grid gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Từ ngày</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Đến ngày</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chuyên mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                <option value="all">Tất cả</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
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

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((result) => (
            <Link key={result.id} href={result.href}>
              <div className="glass-card rounded-2xl p-4 transition hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-amber-400/20">
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    result.type === "event"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-green-500/10 text-green-500"
                  }`}>
                    {result.type === "event" ? <Calendar className="size-5" /> : <Newspaper className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        result.type === "event"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-green-500/10 text-green-500"
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
        </div>
      ) : query && !loading ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <X className="mx-auto size-10 text-muted-foreground/30" />
          <p className="mt-3 font-heading text-sm font-bold uppercase text-muted-foreground">KHÔNG TÌM THẤY KẾT QUẢ</p>
          <p className="mt-1 text-xs text-muted-foreground">Thử tìm với từ khóa khác</p>
        </div>
      ) : null}
    </div>
  );
}
