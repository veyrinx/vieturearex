"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search, Copy, Check, X, Image as ImageIcon, ExternalLink,
  Star, Trash2, Plus, Loader2, Filter, ArrowDownAZ, ArrowUpAZ, Clock,
  Tag as TagIcon, Swords, User, PawPrint, Shirt, Sparkles, Package,
  Database, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/ShahGCreator/icon@main/PNG";

function buildUrl(id: string) {
  return `${ICON_BASE}/${encodeURIComponent(id.trim())}.png`;
}

// ───────────────────────────────────────────────────────────────────────────
// Categories — Vietnamese labels with color + icon
// ───────────────────────────────────────────────────────────────────────────
type CategoryKey =
  | "weapon" | "character" | "pet" | "outfit" | "skin"
  | "accessory" | "emote" | "vehicle" | "other";

type Category = {
  key: CategoryKey;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
};

const CATEGORIES: Category[] = [
  { key: "weapon",    label: "Súng / Vũ khí", icon: Swords,    color: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/30" },
  { key: "character", label: "Nhân vật",       icon: User,      color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  { key: "pet",       label: "Pet",            icon: PawPrint,  color: "text-pink-500",    bg: "bg-pink-500/10",    border: "border-pink-500/30" },
  { key: "outfit",    label: "Trang phục",     icon: Shirt,     color: "text-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  { key: "skin",      label: "Skin",           icon: Sparkles,  color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  { key: "accessory", label: "Phụ kiện",       icon: Package,   color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { key: "emote",     label: "Emote",          icon: Sparkles,  color: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/30" },
  { key: "vehicle",   label: "Xe",             icon: Package,   color: "text-cyan-500",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
  { key: "other",     label: "Khác",           icon: TagIcon,   color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
];

const CAT_MAP = new Map<CategoryKey, Category>(CATEGORIES.map((c) => [c.key, c]));

type Recent = { id: string; ts: number };
type Favorite = { id: string; label?: string; category?: CategoryKey };

const RECENT_KEY = "ff-items:recent";
const FAV_KEY = "ff-items:favorites";

type SortMode = "newest" | "oldest" | "id_asc" | "id_desc";

const SORT_LABELS: Record<SortMode, { label: string; icon: React.ElementType }> = {
  newest:  { label: "Mới nhất",  icon: Clock },
  oldest:  { label: "Cũ nhất",   icon: Clock },
  id_asc:  { label: "ID A-Z",    icon: ArrowDownAZ },
  id_desc: { label: "ID Z-A",    icon: ArrowUpAZ },
};

export default function FFItemsPage() {
  const [id, setId] = useState("");
  const [debouncedId, setDebouncedId] = useState("");
  const [loaded, setLoaded] = useState<Record<string, "ok" | "fail">>({});
  const [recents, setRecents] = useState<Recent[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [tagModalId, setTagModalId] = useState<string | null>(null);

  // All items from API
  const [allIds, setAllIds] = useState<string[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [allCached, setAllCached] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [debouncedLibSearch, setDebouncedLibSearch] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const PAGE_SIZE = 60;
  const [activePrefix, setActivePrefix] = useState<string>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagModal, setBulkTagModal] = useState(false);

  // Load saved data
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[];
      const f = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as Favorite[];
      setRecents(Array.isArray(r) ? r : []);
      setFavorites(Array.isArray(f) ? f : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedId(id.trim()), 300);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLibSearch(librarySearch.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [librarySearch]);

  useEffect(() => { setLibraryPage(1); }, [debouncedLibSearch, activePrefix]);

  // Compute prefix groups (first 3 digits) from library
  const prefixGroups = useMemo(() => {
    if (allIds.length === 0) return [] as Array<{ prefix: string; count: number }>;
    const map = new Map<string, number>();
    for (const idStr of allIds) {
      const m = idStr.match(/^(\d{3})/);
      const key = m ? m[1] : "other";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([prefix, count]) => ({ prefix, count }));
  }, [allIds]);

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const bulkAddToFavorites = (category: CategoryKey) => {
    if (selectedIds.size === 0) return;
    setFavorites((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const toAdd = [...selectedIds]
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ id, category }));
      const next = [...toAdd, ...prev];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`Đã thêm ${selectedIds.size} icon vào ${CAT_MAP.get(category)?.label}`);
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkTagModal(false);
  };

  const loadLibrary = async (force = false) => {
    setAllLoading(true);
    setAllError(null);
    try {
      const res = await fetch(`/api/admin/ff-items${force ? "?force=1" : ""}`);
      const data = await res.json() as {
        ids?: string[];
        cached?: boolean;
        source?: string;
        error?: string;
        details?: Array<{ endpoint: string; status?: number; error: string }>;
      };
      if (!res.ok) {
        const detail = data.details?.[0]
          ? `${data.error}: ${data.details.map((d) => `${d.endpoint} (${d.status ?? "—"})`).join(", ")}`
          : (data.error ?? "Không thể tải");
        setAllError(detail);
        toast.error(data.error ?? "Lỗi tải thư viện");
        return;
      }
      setAllIds(data.ids ?? []);
      setAllCached(data.cached ?? false);
      if (data.ids?.length) {
        const src = data.source ? ` qua ${data.source}` : "";
        toast.success(`Đã tải ${data.ids.length.toLocaleString()} items${data.cached ? " (cache)" : src}`);
      }
    } catch (err) {
      setAllError(`Lỗi mạng: ${String(err).slice(0, 100)}`);
    } finally {
      setAllLoading(false);
    }
  };

  const handleImageLoad = (itemId: string) => {
    setLoaded((prev) => ({ ...prev, [itemId]: "ok" }));
    setRecents((prev) => {
      const next = [{ id: itemId, ts: Date.now() }, ...prev.filter((r) => r.id !== itemId)].slice(0, 30);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleImageError = (itemId: string) => {
    setLoaded((prev) => ({ ...prev, [itemId]: "fail" }));
  };

  const copyUrl = (itemId: string) => {
    navigator.clipboard.writeText(buildUrl(itemId)).then(() => {
      setCopiedId(itemId);
      toast.success("Đã copy URL");
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const copyId = (itemId: string) => {
    navigator.clipboard.writeText(itemId).then(() => {
      toast.success(`Đã copy ID: ${itemId}`);
    });
  };

  const toggleFavorite = (itemId: string, category?: CategoryKey) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === itemId);
      const next = exists
        ? prev.filter((f) => f.id !== itemId)
        : [{ id: itemId, category: category ?? "other" }, ...prev];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      toast.success(exists ? "Đã bỏ yêu thích" : "Đã thêm yêu thích");
      return next;
    });
  };

  const updateFavoriteCategory = (itemId: string, category: CategoryKey) => {
    setFavorites((prev) => {
      const next = prev.map((f) => f.id === itemId ? { ...f, category } : f);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`Đã gắn nhãn: ${CAT_MAP.get(category)?.label}`);
  };

  const removeRecent = (itemId: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.id !== itemId);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleBulkSearch = () => {
    const ids = bulkInput
      .split(/[\s,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) { toast.error("Nhập ít nhất 1 ID"); return; }
    if (ids.length > 50) { toast.error("Tối đa 50 ID cùng lúc"); return; }
    setBulkIds(ids);
  };

  const isFavorited = (itemId: string) => favorites.some((f) => f.id === itemId);
  const getFavoriteCategory = (itemId: string): CategoryKey | undefined =>
    favorites.find((f) => f.id === itemId)?.category;

  // ── Filter & sort favorites ──
  const filteredFavorites = useMemo(() => {
    let list = favorites;
    if (activeCategory !== "all") {
      list = list.filter((f) => (f.category ?? "other") === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((f) => f.id.toLowerCase().includes(q));
    }
    const arr = [...list];
    if (sort === "id_asc") arr.sort((a, b) => a.id.localeCompare(b.id));
    else if (sort === "id_desc") arr.sort((a, b) => b.id.localeCompare(a.id));
    // newest/oldest based on insertion order (newest first by default in favorites array)
    else if (sort === "oldest") arr.reverse();
    return arr;
  }, [favorites, activeCategory, search, sort]);

  const previewUrl = useMemo(() => debouncedId ? buildUrl(debouncedId) : null, [debouncedId]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: favorites.length };
    for (const c of CATEGORIES) counts[c.key] = 0;
    for (const f of favorites) {
      const k = f.category ?? "other";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [favorites]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
          <ImageIcon className="size-5 text-primary dark:text-amber-400" /> Free Fire Items Lookup
        </h1>
        <p className="text-sm text-muted-foreground">
          Tra cứu icon Free Fire bằng Item ID. URL theo định dạng{" "}
          <code className="font-mono text-[11px] text-primary dark:text-amber-400">{ICON_BASE}/{"{id}"}.png</code>
        </p>
      </div>

      {/* Search section */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Item ID
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="VD: 211000000, 203000234..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            {id && (
              <button onClick={() => setId("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        {previewUrl && debouncedId && (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-background flex items-center justify-center">
              {loaded[debouncedId] === "fail" ? (
                <X className="size-8 text-destructive" />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={debouncedId}
                    onLoad={() => handleImageLoad(debouncedId)}
                    onError={() => handleImageError(debouncedId)}
                    className="size-full object-contain p-2"
                  />
                  {!loaded[debouncedId] && (
                    <Loader2 className="absolute size-6 animate-spin text-muted-foreground" />
                  )}
                </>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {loaded[debouncedId] === "fail" ? "Không tìm thấy" : "Item ID"}
              </p>
              <p className="font-mono font-bold text-sm break-all">{debouncedId}</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{previewUrl}</p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => copyUrl(debouncedId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {copiedId === debouncedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedId === debouncedId ? "Đã copy" : "Copy URL"}
              </button>
              <button
                onClick={() => toggleFavorite(debouncedId)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  isFavorited(debouncedId)
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-border bg-card hover:border-amber-500/40"
                }`}
              >
                <Star className={`size-3.5 ${isFavorited(debouncedId) ? "fill-current" : ""}`} />
                {isFavorited(debouncedId) ? "Đã lưu" : "Lưu"}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="size-3.5" /> Mở
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Library — Toàn bộ items từ jsDelivr */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Database className="size-4 text-primary dark:text-amber-400" /> Thư viện Items
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Toàn bộ icon có trong CDN jsDelivr
              {allIds.length > 0 && (
                <> · <span className="font-semibold text-foreground">{allIds.length.toLocaleString()} items</span>
                {allCached && <span className="ml-1 text-amber-500">(cache)</span>}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allIds.length > 0 && (
              <button
                onClick={() => void loadLibrary(true)}
                disabled={allLoading}
                title="Tải lại từ jsDelivr (bỏ qua cache)"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${allLoading ? "animate-spin" : ""}`} /> Tải lại
              </button>
            )}
            <button
              onClick={() => void loadLibrary(false)}
              disabled={allLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {allLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
              {allLoading ? "Đang tải..." : allIds.length > 0 ? "Đã tải" : "Tải thư viện"}
            </button>
          </div>
        </div>

        {allError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
            {allError}
          </div>
        )}

        {allIds.length > 0 && (
          <>
            {/* Search + Bulk Mode toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Tìm trong thư viện theo ID (vd: 211, 203000...)"
                  className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {librarySearch && (
                  <button onClick={() => setLibrarySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  selectMode
                    ? "border-primary/40 bg-primary/10 text-primary dark:text-amber-400"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <Check className="size-3.5" />
                {selectMode ? "Hủy chọn" : "Chọn nhiều"}
              </button>
            </div>

            {/* Prefix group tabs */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActivePrefix("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activePrefix === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="size-3" />
                Tất cả
                <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[9px] tabular-nums">{allIds.length.toLocaleString()}</span>
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

            {/* Bulk action bar */}
            {selectMode && selectedIds.size > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 dark:border-amber-400/30 dark:bg-amber-400/5">
                <p className="text-sm font-bold text-primary dark:text-amber-400">
                  Đã chọn {selectedIds.size} icon
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    onClick={() => setBulkTagModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                  >
                    <TagIcon className="size-3.5" /> Lưu & gắn nhãn
                  </button>
                </div>
              </div>
            )}

            {(() => {
              let base = allIds;
              if (activePrefix !== "all") {
                base = base.filter((x) => x.startsWith(activePrefix));
              }
              const filtered = debouncedLibSearch
                ? base.filter((x) => x.toLowerCase().includes(debouncedLibSearch))
                : base;
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const page = Math.min(libraryPage, totalPages);
              const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Search className="size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Không có ID khớp với &quot;{librarySearch}&quot;</p>
                  </div>
                );
              }

              return (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {debouncedLibSearch
                      ? <>Tìm thấy <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span> ID</>
                      : <>Hiển thị {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString()}</>}
                    {" "}· Trang {page} / {totalPages}
                  </p>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
                    {slice.map((itemId) => (
                      <ItemThumb
                        key={itemId}
                        id={itemId}
                        isFavorited={isFavorited(itemId)}
                        category={getFavoriteCategory(itemId)}
                        selectMode={selectMode}
                        selected={selectedIds.has(itemId)}
                        onToggleSelect={() => toggleSelected(itemId)}
                        onCopy={() => copyUrl(itemId)}
                        onCopyId={() => copyId(itemId)}
                        onFavorite={() => toggleFavorite(itemId)}
                        onTag={() => setTagModalId(itemId)}
                        onSelect={() => setId(itemId)}
                        copied={copiedId === itemId}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronLeft className="size-3.5" /> Trước
                      </button>
                      <span className="text-xs font-mono tabular-nums">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setLibraryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-30"
                      >
                        Sau <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Bulk search */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-foreground">
              Tra cứu hàng loạt
            </h2>
            <p className="text-[10px] text-muted-foreground">Nhập nhiều ID (cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng)</p>
          </div>
        </div>
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="211000000&#10;211000001&#10;211000002"
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkSearch}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            <Search className="size-3.5" /> Tra cứu
          </button>
          {bulkIds.length > 0 && (
            <button
              onClick={() => { setBulkInput(""); setBulkIds([]); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
            >
              <X className="size-3.5" /> Xóa
            </button>
          )}
        </div>

        {bulkIds.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 pt-2">
            {bulkIds.map((itemId) => (
              <ItemThumb
                key={itemId}
                id={itemId}
                isFavorited={isFavorited(itemId)}
                category={getFavoriteCategory(itemId)}
                onCopy={() => copyUrl(itemId)}
                onCopyId={() => copyId(itemId)}
                onFavorite={() => toggleFavorite(itemId)}
                onTag={() => setTagModalId(itemId)}
                copied={copiedId === itemId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Favorites with filter */}
      {favorites.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <Star className="size-3.5 fill-current" /> Đã lưu ({favorites.length})
            </h2>
          </div>

          {/* Filter + search + sort bar */}
          <div className="space-y-3 rounded-xl bg-muted/30 p-3">
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activeCategory === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="size-3" />
                Tất cả
                <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[9px] tabular-nums">{categoryCounts.all}</span>
              </button>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = categoryCounts[cat.key] ?? 0;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    disabled={count === 0 && !isActive}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                      isActive
                        ? `${cat.bg} ${cat.color} border ${cat.border}`
                        : count > 0
                          ? "border border-border bg-card text-muted-foreground hover:text-foreground"
                          : "border border-border bg-card text-muted-foreground/40 cursor-not-allowed"
                    }`}
                  >
                    <Icon className="size-3" />
                    {cat.label}
                    {count > 0 && (
                      <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[9px] tabular-nums opacity-70">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search + sort */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo ID..."
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-xs font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => {
                  const { label, icon: Icon } = SORT_LABELS[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      title={label}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                        sort === s
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3" />
                      <span className="hidden md:inline">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results count */}
          {(activeCategory !== "all" || search) && (
            <p className="text-[11px] text-muted-foreground">
              Hiển thị {filteredFavorites.length} / {favorites.length} icon
              {activeCategory !== "all" && (
                <> · loại <span className="font-semibold text-foreground">{CAT_MAP.get(activeCategory as CategoryKey)?.label}</span></>
              )}
            </p>
          )}

          {/* Grid */}
          {filteredFavorites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Filter className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Không có icon nào phù hợp bộ lọc</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {filteredFavorites.map((fav) => (
                <ItemThumb
                  key={fav.id}
                  id={fav.id}
                  isFavorited={true}
                  category={fav.category}
                  onCopy={() => copyUrl(fav.id)}
                  onCopyId={() => copyId(fav.id)}
                  onFavorite={() => toggleFavorite(fav.id)}
                  onTag={() => setTagModalId(fav.id)}
                  onSelect={() => setId(fav.id)}
                  copied={copiedId === fav.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent */}
      {recents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-foreground">
              Gần đây ({recents.length})
            </h2>
            <button
              onClick={() => { setRecents([]); localStorage.removeItem(RECENT_KEY); }}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Xóa hết
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {recents.map((r) => (
              <ItemThumb
                key={r.id}
                id={r.id}
                isFavorited={isFavorited(r.id)}
                category={getFavoriteCategory(r.id)}
                onCopy={() => copyUrl(r.id)}
                onCopyId={() => copyId(r.id)}
                onFavorite={() => toggleFavorite(r.id)}
                onTag={() => setTagModalId(r.id)}
                onRemove={() => removeRecent(r.id)}
                onSelect={() => setId(r.id)}
                copied={copiedId === r.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <Plus className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Hướng dẫn nhanh</p>
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            <li>Item ID là 9 chữ số, ví dụ: <code className="font-mono">203000234</code></li>
            <li>Click ngôi sao để lưu icon vào danh sách yêu thích</li>
            <li>Click icon thẻ (Tag) để phân loại icon thành: Súng, Nhân vật, Pet, Trang phục...</li>
            <li>Dùng bộ lọc theo loại để tìm nhanh icon đã lưu</li>
            <li>Dùng &quot;Tra cứu hàng loạt&quot; để preview nhiều icon cùng lúc</li>
          </ul>
        </div>
      </div>

      {/* Bulk tag modal */}
      {bulkTagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setBulkTagModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Phân loại hàng loạt</p>
                <p className="text-sm font-bold text-foreground">Chọn loại cho {selectedIds.size} icon</p>
              </div>
              <button onClick={() => setBulkTagModal(false)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => bulkAddToFavorites(cat.key)}
                    className="flex items-center gap-2.5 rounded-xl border-2 border-border bg-muted/30 p-3 text-left transition-all hover:scale-[1.02] hover:border-foreground/30"
                  >
                    <span className={`flex size-9 items-center justify-center rounded-lg ${cat.bg}`}>
                      <Icon className={`size-4 ${cat.color}`} />
                    </span>
                    <span className="text-xs font-bold text-foreground">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tag modal */}
      {tagModalId && (
        <TagModal
          itemId={tagModalId}
          currentCategory={getFavoriteCategory(tagModalId)}
          isFavorited={isFavorited(tagModalId)}
          onSelect={(cat) => {
            if (!isFavorited(tagModalId)) {
              toggleFavorite(tagModalId, cat);
            } else {
              updateFavoriteCategory(tagModalId, cat);
            }
            setTagModalId(null);
          }}
          onClose={() => setTagModalId(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Tag selection modal
// ───────────────────────────────────────────────────────────────────────────
function TagModal({
  itemId, currentCategory, isFavorited, onSelect, onClose,
}: {
  itemId: string;
  currentCategory?: CategoryKey;
  isFavorited: boolean;
  onSelect: (cat: CategoryKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Phân loại</p>
            <p className="text-sm font-bold text-foreground">
              {isFavorited ? "Đổi loại icon" : "Lưu & phân loại"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{itemId}</p>
          </div>
          <button onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = currentCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onSelect(cat.key)}
                className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] ${
                  isActive
                    ? `${cat.bg} ${cat.border}`
                    : "border-border bg-muted/30 hover:border-foreground/30"
                }`}
              >
                <span className={`flex size-9 items-center justify-center rounded-lg ${cat.bg}`}>
                  <Icon className={`size-4 ${cat.color}`} />
                </span>
                <span className={`text-xs font-bold ${isActive ? cat.color : "text-foreground"}`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Item thumbnail with category badge
// ───────────────────────────────────────────────────────────────────────────
function ItemThumb({
  id, isFavorited, category, selectMode, selected, onToggleSelect,
  onCopy, onCopyId, onFavorite, onTag, onRemove, onSelect, copied,
}: {
  id: string;
  isFavorited: boolean;
  category?: CategoryKey;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onCopy: () => void;
  onCopyId: () => void;
  onFavorite: () => void;
  onTag?: () => void;
  onRemove?: () => void;
  onSelect?: () => void;
  copied: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");
  const url = buildUrl(id);
  const cat = category ? CAT_MAP.get(category) : null;

  // In select mode, clicking the thumb toggles selection
  const handleThumbClick = () => {
    if (selectMode && onToggleSelect) onToggleSelect();
  };

  return (
    <div
      onClick={handleThumbClick}
      className={`group relative rounded-xl border bg-muted/30 p-2 space-y-1.5 transition-colors ${
        selectMode ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-primary bg-primary/10 dark:border-amber-400 dark:bg-amber-400/10"
          : "border-border hover:border-primary/40"
      }`}
    >
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

        {/* Selection checkbox */}
        {selectMode && (
          <span className={`absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-primary bg-primary text-primary-foreground dark:border-amber-400 dark:bg-amber-400"
              : "border-border bg-card"
          }`}>
            {selected && <Check className="size-3" />}
          </span>
        )}

        {/* Category badge */}
        {cat && !selectMode && (
          <span className={`absolute left-1 top-1 flex size-5 items-center justify-center rounded ${cat.bg} ${cat.color}`} title={cat.label}>
            <cat.icon className="size-3" />
          </span>
        )}

        {/* Hover actions — disabled in select mode */}
        {!selectMode && (
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <button onClick={onCopy} title="Copy URL"
            className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-primary/40">
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </button>
          <button onClick={onFavorite} title={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
            className={`flex size-7 items-center justify-center rounded-lg border ${isFavorited ? "border-amber-500/40 bg-amber-500/10 text-amber-500" : "border-border bg-card"}`}>
            <Star className={`size-3 ${isFavorited ? "fill-current" : ""}`} />
          </button>
          {onTag && (
            <button onClick={onTag} title="Phân loại"
              className={`flex size-7 items-center justify-center rounded-lg border ${cat ? `${cat.bg} ${cat.border} ${cat.color}` : "border-border bg-card hover:border-primary/40"}`}>
              <TagIcon className="size-3" />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} title="Xóa khỏi gần đây"
              className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-destructive/40 hover:text-destructive">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
        )}
      </div>
      <button
        onClick={onCopyId}
        title="Click để copy ID — double click để chọn"
        onDoubleClick={onSelect}
        className="block w-full text-center font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate"
      >
        {id}
      </button>
    </div>
  );
}
