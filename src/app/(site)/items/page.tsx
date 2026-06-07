"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search, X, Image as ImageIcon, Copy, Check, ChevronLeft, ChevronRight,
  Loader2, Database, ExternalLink, Filter, Server, AlertCircle, Download,
} from "lucide-react";

const FALLBACK_CDN = "https://cdn.jsdelivr.net/gh/ShahGCreator/icon@main/PNG";
const PAGE_SIZE = 60;

export default function ItemsPublicPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activePrefix, setActivePrefix] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bucketMissing, setBucketMissing] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeDigit, setActiveDigit] = useState<string>("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Catalog metadata (id → label, category)
  type CatalogEntry = { id: string; label: string | null; category: string | null };
  const [catalog, setCatalog] = useState<Map<string, CatalogEntry>>(new Map());

  useEffect(() => {
    // Load both storage list and catalog in parallel
    Promise.all([
      fetch("/api/ff-items").then((r) => r.json()).catch(() => null),
      fetch("/api/ff-items/catalog").then((r) => r.json()).catch(() => null),
    ]).then(([storage, cat]) => {
      const d = storage as { ids?: string[]; baseUrl?: string | null; bucketMissing?: boolean; error?: string } | null;
      if (d?.bucketMissing) setBucketMissing(true);
      setIds(d?.ids ?? []);
      setBaseUrl(d?.baseUrl ?? null);
      if (d?.error) setError(d.error);

      const c = cat as { items?: CatalogEntry[] } | null;
      if (c?.items) {
        setCatalog(new Map(c.items.map((it) => [it.id, it])));
      }
    }).finally(() => setLoading(false));
  }, []);

  const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    weapon:    { label: "Súng / Vũ khí",  color: "text-red-500",     bg: "bg-red-500/10" },
    character: { label: "Nhân vật",        color: "text-blue-500",    bg: "bg-blue-500/10" },
    pet:       { label: "Pet",             color: "text-pink-500",    bg: "bg-pink-500/10" },
    outfit:    { label: "Trang phục",      color: "text-purple-500",  bg: "bg-purple-500/10" },
    skin:      { label: "Skin",            color: "text-amber-500",   bg: "bg-amber-500/10" },
    accessory: { label: "Phụ kiện",        color: "text-emerald-500", bg: "bg-emerald-500/10" },
    emote:     { label: "Emote",           color: "text-violet-500",  bg: "bg-violet-500/10" },
    vehicle:   { label: "Xe",              color: "text-cyan-500",    bg: "bg-cyan-500/10" },
    other:     { label: "Khác",            color: "text-muted-foreground", bg: "bg-muted" },
  };

  // Get category counts from catalog
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of catalog.values()) {
      const c = it.category ?? "other";
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [catalog]);

  const categoriesWithCounts = useMemo(() =>
    Object.entries(CATEGORY_LABELS)
      .filter(([key]) => (categoryCounts[key] ?? 0) > 0)
      .map(([key, meta]) => ({ key, ...meta, count: categoryCounts[key] ?? 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryCounts]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, activePrefix, activeDigit]);

  // When activeDigit changes, reset prefix if it doesn't match
  useEffect(() => {
    if (activeDigit !== "all" && activePrefix !== "all" && !activePrefix.startsWith(activeDigit)) {
      setActivePrefix("all");
    }
  }, [activeDigit, activePrefix]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowRight") setLightboxIdx((i) => (i ?? 0) + 1 < slice.length ? (i ?? 0) + 1 : i);
      else if (e.key === "ArrowLeft") setLightboxIdx((i) => (i ?? 0) - 1 >= 0 ? (i ?? 0) - 1 : i);
      else if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const cur = slice[lightboxIdx];
        if (cur) {
          navigator.clipboard.writeText(buildUrl(cur));
          toast.success("Đã copy URL");
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx]);

  const buildUrl = (id: string) => baseUrl ? `${baseUrl}${id}.png` : `${FALLBACK_CDN}/${id}.png`;

  // Top-level digit groups (first character)
  const digitGroups = useMemo(() => {
    if (ids.length === 0) return [] as Array<{ digit: string; count: number }>;
    const map = new Map<string, number>();
    for (const idStr of ids) {
      const d = idStr.charAt(0);
      if (/\d/.test(d)) map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([digit, count]) => ({ digit, count }));
  }, [ids]);

  // Sub-prefix groups (3 chars) — only show those matching active digit
  const prefixGroups = useMemo(() => {
    if (ids.length === 0) return [] as Array<{ prefix: string; count: number }>;
    const map = new Map<string, number>();
    for (const idStr of ids) {
      if (activeDigit !== "all" && !idStr.startsWith(activeDigit)) continue;
      const m = idStr.match(/^(\d{3})/);
      const key = m ? m[1] : "other";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([prefix, count]) => ({ prefix, count }));
  }, [ids, activeDigit]);

  const filtered = useMemo(() => {
    let list = ids;
    if (activeCategory !== "all") {
      list = list.filter((x) => catalog.get(x)?.category === activeCategory);
    }
    if (activeDigit !== "all") list = list.filter((x) => x.startsWith(activeDigit));
    if (activePrefix !== "all") list = list.filter((x) => x.startsWith(activePrefix));
    if (debouncedSearch) {
      list = list.filter((x) =>
        x.toLowerCase().includes(debouncedSearch) ||
        (catalog.get(x)?.label?.toLowerCase().includes(debouncedSearch) ?? false),
      );
    }
    return list;
  }, [ids, activeCategory, activeDigit, activePrefix, debouncedSearch, catalog]);

  // Search autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!debouncedSearch || !showSuggestions) return [];
    return ids
      .filter((x) => x.toLowerCase().startsWith(debouncedSearch))
      .slice(0, 8);
  }, [ids, debouncedSearch, showSuggestions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const copyUrl = (id: string) => {
    const url = buildUrl(id);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success("Đã copy URL");
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  if (bucketMissing) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <Server className="size-16 mx-auto text-muted-foreground/30" />
        <div>
          <h1 className="font-heading text-2xl font-black uppercase">Thư viện chưa sẵn sàng</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quản trị viên cần đồng bộ icon trước khi trang này có thể hiển thị.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl py-8 md:py-12 space-y-6 max-w-full overflow-x-hidden">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-amber-500/5 dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <ImageIcon className="size-6 text-primary dark:text-amber-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Free Fire</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Thư Viện Icon
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Đang tải..." : `${ids.length.toLocaleString()} icon · Click để copy URL`}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
        {/* Search with autocomplete */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Tìm theo Item ID (vd: 211, 203000234...)"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                Gợi ý ({suggestions.length})
              </p>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setSearch(sug); setShowSuggestions(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <Search className="size-3 text-muted-foreground" />
                  <span className="font-mono text-sm">{sug}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category filter (Vietnamese) — only when catalog has data */}
        {categoriesWithCounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Theo loại</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activeCategory === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả loại
              </button>
              {categoriesWithCounts.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                    activeCategory === cat.key
                      ? `${cat.bg} ${cat.color}`
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                  <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] tabular-nums opacity-70">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level 1: Digit groups (first character) */}
        {digitGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nhóm chính</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setActiveDigit("all"); setActivePrefix("all"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activeDigit === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="size-3" />
                Tất cả
                <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[9px] tabular-nums">{ids.length.toLocaleString()}</span>
              </button>
              {digitGroups.map(({ digit, count }) => (
                <button
                  key={digit}
                  onClick={() => setActiveDigit(digit)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                    activeDigit === digit
                      ? "bg-primary text-primary-foreground dark:bg-amber-500 dark:text-background"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-mono">{digit}xxxxxxxx</span>
                  <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] tabular-nums opacity-70">{count.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level 2: Prefix groups (3-char) - only when a digit is selected */}
        {activeDigit !== "all" && prefixGroups.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nhóm con (3 số)</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActivePrefix("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activePrefix === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả {activeDigit}
              </button>
              {prefixGroups.map(({ prefix, count }) => (
                <button
                  key={prefix}
                  onClick={() => setActivePrefix(prefix)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                    activePrefix === prefix
                      ? "bg-primary text-primary-foreground dark:bg-amber-500 dark:text-background"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-mono">{prefix}xxxxxx</span>
                  <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filter pill — easy clear */}
        {(activeDigit !== "all" || activePrefix !== "all" || debouncedSearch) && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Đang lọc:</span>
            {activeDigit !== "all" && (
              <button
                onClick={() => { setActiveDigit("all"); setActivePrefix("all"); }}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 px-2 py-0.5 text-[10px] font-mono font-bold hover:opacity-70"
              >
                {activeDigit}xxx <X className="size-2.5" />
              </button>
            )}
            {activePrefix !== "all" && (
              <button
                onClick={() => setActivePrefix("all")}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 px-2 py-0.5 text-[10px] font-mono font-bold hover:opacity-70"
              >
                {activePrefix}xxxxxx <X className="size-2.5" />
              </button>
            )}
            {debouncedSearch && (
              <button
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 px-2 py-0.5 text-[10px] font-mono font-bold hover:opacity-70"
              >
                &quot;{debouncedSearch}&quot; <X className="size-2.5" />
              </button>
            )}
            <button
              onClick={() => { setActiveDigit("all"); setActivePrefix("all"); setSearch(""); }}
              className="ml-auto text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải thư viện...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertCircle className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && ids.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-3">
          <Database className="size-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Chưa có icon nào trong thư viện.</p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && ids.length > 0 && (
        <>
          {/* Result count */}
          <p className="text-xs text-muted-foreground px-1">
            {debouncedSearch || activePrefix !== "all" ? (
              <>Tìm thấy <span className="font-bold text-foreground">{filtered.length.toLocaleString()}</span> icon</>
            ) : (
              <>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} – {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString()}</>
            )}
            {" · "}Trang {currentPage} / {totalPages}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Search className="size-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Không tìm thấy icon nào.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                {slice.map((id, idx) => {
                  const meta = catalog.get(id);
                  return (
                    <ItemCard
                      key={id}
                      id={id}
                      label={meta?.label ?? null}
                      url={buildUrl(id)}
                      onCopy={() => copyUrl(id)}
                      onOpen={() => setLightboxIdx(idx)}
                      copied={copiedId === id}
                    />
                  );
                })}
              </div>

              {/* Lightbox */}
              {lightboxIdx !== null && slice[lightboxIdx] && (
                <Lightbox
                  id={slice[lightboxIdx]}
                  url={buildUrl(slice[lightboxIdx])}
                  idx={lightboxIdx}
                  total={slice.length}
                  onClose={() => setLightboxIdx(null)}
                  onPrev={() => setLightboxIdx((i) => (i ?? 0) - 1 >= 0 ? (i ?? 0) - 1 : i)}
                  onNext={() => setLightboxIdx((i) => (i ?? 0) + 1 < slice.length ? (i ?? 0) + 1 : i)}
                  onCopy={() => copyUrl(slice[lightboxIdx])}
                  copied={copiedId === slice[lightboxIdx]}
                />
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/40 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-3.5" /> Trước
                  </button>
                  <span className="text-xs font-mono tabular-nums px-2">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/40 disabled:opacity-30"
                  >
                    Sau <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ItemCard({ id, label, url, onCopy, onOpen, copied }: {
  id: string;
  label?: string | null;
  url: string;
  onCopy: () => void;
  onOpen: () => void;
  copied: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  return (
    <div className="group relative rounded-xl border border-border bg-muted/30 p-2 space-y-1.5 hover:border-primary/40 transition-colors">
      <button
        onClick={onOpen}
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-background flex items-center justify-center cursor-zoom-in"
      >
        {status === "fail" ? (
          <X className="size-6 text-destructive/60" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={id}
              onLoad={() => setStatus("ok")}
              onError={() => setStatus("fail")}
              className="size-full object-contain p-1"
              loading="lazy"
            />
            {status === "loading" && (
              <Loader2 className="absolute size-4 animate-spin text-muted-foreground" />
            )}
          </>
        )}

        {/* Hover overlay — show copy button */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <span className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1 text-[10px] font-bold">
            <ImageIcon className="size-3" /> Xem
          </span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          {label && (
            <p className="truncate text-[10px] font-bold text-foreground leading-tight">{label}</p>
          )}
          <p className={`truncate font-mono text-[10px] leading-tight ${label ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {id}
          </p>
        </div>
        <button onClick={onCopy} title="Copy URL"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
        </button>
      </div>
    </div>
  );
}

function Lightbox({
  id, url, idx, total, onClose, onPrev, onNext, onCopy, copied,
}: {
  id: string;
  url: string;
  idx: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div className="absolute left-0 right-0 top-0 p-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="rounded-xl bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-mono text-white pointer-events-auto">
          {idx + 1} / {total}
        </div>
        <button onClick={onClose}
          className="pointer-events-auto flex size-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors">
          <X className="size-5" />
        </button>
      </div>

      {/* Prev / Next */}
      {idx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {idx < total - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Content */}
      <div
        className="relative max-w-2xl w-full rounded-3xl bg-card overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-background flex items-center justify-center p-6 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={id} className="max-h-full max-w-full object-contain" />
        </div>

        <div className="border-t border-border p-4 sm:p-5 space-y-3">
          {/* ID */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item ID</p>
            <p className="font-mono font-bold text-base sm:text-lg break-all">{id}</p>
          </div>

          {/* URL */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL</p>
            <p className="font-mono text-[11px] text-muted-foreground break-all line-clamp-2">{url}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Đã copy" : "Copy URL"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 transition-colors"
            >
              <ExternalLink className="size-3.5" /> Mở ảnh
            </a>
            <a
              href={url}
              download={`${id}.png`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 transition-colors"
            >
              <Download className="size-3.5" /> Tải xuống
            </a>
            <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">←</kbd>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">→</kbd>
              <span>điều hướng</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono ml-1">Esc</kbd>
              <span>đóng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
