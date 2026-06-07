"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search, X, Image as ImageIcon, Copy, Check, ChevronLeft, ChevronRight,
  Loader2, Database, ExternalLink, Filter, Server, AlertCircle,
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

  useEffect(() => {
    fetch("/api/ff-items")
      .then((r) => r.json())
      .then((d: { ids?: string[]; baseUrl?: string | null; bucketMissing?: boolean; error?: string }) => {
        if (d.bucketMissing) setBucketMissing(true);
        setIds(d.ids ?? []);
        setBaseUrl(d.baseUrl ?? null);
        if (d.error) setError(d.error);
      })
      .catch(() => setError("Không thể tải"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, activePrefix]);

  const buildUrl = (id: string) => baseUrl ? `${baseUrl}${id}.png` : `${FALLBACK_CDN}/${id}.png`;

  const prefixGroups = useMemo(() => {
    if (ids.length === 0) return [] as Array<{ prefix: string; count: number }>;
    const map = new Map<string, number>();
    for (const idStr of ids) {
      const m = idStr.match(/^(\d{3})/);
      const key = m ? m[1] : "other";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([prefix, count]) => ({ prefix, count }));
  }, [ids]);

  const filtered = useMemo(() => {
    let list = ids;
    if (activePrefix !== "all") list = list.filter((x) => x.startsWith(activePrefix));
    if (debouncedSearch) list = list.filter((x) => x.toLowerCase().includes(debouncedSearch));
    return list;
  }, [ids, activePrefix, debouncedSearch]);

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

      {/* Search */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Item ID (vd: 211, 203000234...)"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Prefix tabs */}
        {prefixGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActivePrefix("all")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                activePrefix === "all"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="size-3" />
              Tất cả
              <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[9px] tabular-nums">{ids.length.toLocaleString()}</span>
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
                <span className="font-mono">{prefix}xxx</span>
                <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] tabular-nums opacity-70">{count}</span>
              </button>
            ))}
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
                {slice.map((id) => (
                  <ItemCard
                    key={id}
                    id={id}
                    url={buildUrl(id)}
                    onCopy={() => copyUrl(id)}
                    copied={copiedId === id}
                  />
                ))}
              </div>

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

function ItemCard({ id, url, onCopy, copied }: { id: string; url: string; onCopy: () => void; copied: boolean }) {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  return (
    <div className="group relative rounded-xl border border-border bg-muted/30 p-2 space-y-1.5 hover:border-primary/40 transition-colors">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-background flex items-center justify-center">
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

        {/* Hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <button onClick={onCopy} title="Copy URL"
            className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-primary/40">
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" title="Mở ảnh"
            className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-primary/40">
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <p className="block w-full truncate text-center font-mono text-[10px] text-muted-foreground">
        {id}
      </p>
    </div>
  );
}
