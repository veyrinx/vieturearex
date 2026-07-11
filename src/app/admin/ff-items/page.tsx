"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Search, Copy, Check, X, Image as ImageIcon, ExternalLink,
  Star, Trash2, Plus, Loader2, Filter, ArrowDownAZ, ArrowUpAZ, Clock,
  Tag as TagIcon, Swords, User, PawPrint, Shirt, Sparkles, Package,
  Database, RefreshCw, ChevronLeft, ChevronRight, Server, CloudDownload, Pause,
  Pencil, Download, Upload,
} from "lucide-react";

// Hiển thị qua proxy same-origin (đủ 33k icon, không phụ thuộc jsDelivr)
const ICON_BASE = "/api/ff-icon";

function buildUrl(id: string) {
  return `${ICON_BASE}/${encodeURIComponent(id.trim())}.png`;
}

// URL tuyệt đối theo domain site (để copy/chia sẻ)
function absoluteUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${buildUrl(id)}`;
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

  // Sync to Supabase Storage
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [syncBaseUrl, setSyncBaseUrl] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; failed: number } | null>(null);
  const [syncRunning, setSyncRunning] = useState(false);
  const syncAbort = useRef(false);

  // Rename modal
  const [renameModal, setRenameModal] = useState<{ id: string; label: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Catalog (DB-backed, shared between admins)
  type CatalogItem = { id: string; label: string | null; category: string | null; is_public: boolean; ob_version?: string };
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addCatalogModal, setAddCatalogModal] = useState(false);
  const [catalogForm, setCatalogForm] = useState({ id: "", label: "", category: "weapon" as CategoryKey, ob_version: "", is_public: true });
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CategoryKey | "all">("all");
  const [editCatalogItem, setEditCatalogItem] = useState<CatalogItem | null>(null);
  const [showAllCatalog, setShowAllCatalog] = useState(false);

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

  // ── Load synced IDs from Supabase ──
  const loadSynced = async () => {
    try {
      const res = await fetch("/api/admin/ff-items/list-synced");
      if (!res.ok) return;
      const data = await res.json() as { ids?: string[]; baseUrl?: string | null };
      setSyncedIds(new Set(data.ids ?? []));
      setSyncBaseUrl(data.baseUrl ?? null);
    } catch { /* ignore */ }
  };

  useEffect(() => { void loadSynced(); void loadCatalog(); }, []);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/ff-items/catalog");
      if (!res.ok) return;
      const data = await res.json() as { items?: CatalogItem[] };
      setCatalog(data.items ?? []);
    } finally {
      setCatalogLoading(false);
    }
  };

  const saveCatalogItem = async () => {
    if (!catalogForm.id.trim()) { toast.error("ID là bắt buộc"); return; }
    setCatalogSaving(true);
    try {
      const res = await fetch("/api/admin/ff-items/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            id: catalogForm.id.trim(),
            label: catalogForm.label.trim() || null,
            category: catalogForm.category,
            is_public: catalogForm.is_public,
          }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Không thể lưu");
        return;
      }
      toast.success("Đã lưu vào catalog");
      setCatalogForm({ id: "", label: "", category: "weapon", ob_version: "", is_public: true });
      setAddCatalogModal(false);
      void loadCatalog();
    } finally {
      setCatalogSaving(false);
    }
  };

  const deleteCatalogItem = async (id: string) => {
    if (!confirm(`Xóa "${id}" khỏi catalog?`)) return;
    const res = await fetch("/api/admin/ff-items/catalog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      toast.success("Đã xóa");
      void loadCatalog();
    }
  };

  // Update single catalog item
  const updateCatalogItem = async (item: CatalogItem) => {
    setCatalogSaving(true);
    try {
      const res = await fetch("/api/admin/ff-items/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            id: item.id,
            label: item.label,
            category: item.category,
            is_public: item.is_public,
          }],
        }),
      });
      if (res.ok) {
        toast.success("Đã cập nhật");
        setEditCatalogItem(null);
        void loadCatalog();
      } else {
        toast.error("Không thể cập nhật");
      }
    } finally {
      setCatalogSaving(false);
    }
  };

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (catalogFilter !== "all") {
      list = list.filter((i) => i.category === catalogFilter);
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter((i) =>
        i.id.toLowerCase().includes(q) ||
        (i.label?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [catalog, catalogFilter, catalogSearch]);

  const catalogCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of catalog) {
      const k = it.category ?? "other";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [catalog]);

  // Push selected library items to catalog
  const pushSelectedToCatalog = async (category: CategoryKey) => {
    if (selectedIds.size === 0) return;
    const items = [...selectedIds].map((id) => ({
      id,
      label: null,
      category,
      is_public: true,
    }));
    const res = await fetch("/api/admin/ff-items/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      toast.success(`Đã thêm ${items.length} item vào catalog`);
      setSelectedIds(new Set());
      setSelectMode(false);
      void loadCatalog();
    }
  };

  // ── Sync items to Supabase Storage in batches ──
  const SYNC_BATCH = 20;
  const startSync = async (ids: string[], overwrite = false) => {
    if (syncRunning) return;
    syncAbort.current = false;
    setSyncRunning(true);
    setSyncProgress({ current: 0, total: ids.length, failed: 0 });

    let current = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += SYNC_BATCH) {
      if (syncAbort.current) {
        toast.info("Đã hủy đồng bộ");
        break;
      }
      const batch = ids.slice(i, i + SYNC_BATCH);
      try {
        const res = await fetch("/api/admin/ff-items/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch, overwrite }),
        });
        const data = await res.json() as {
          results?: Array<{ id: string; ok: boolean }>;
          summary?: { success: number; failed: number };
        };
        if (res.ok && data.results) {
          for (const r of data.results) {
            if (r.ok) {
              setSyncedIds((prev) => new Set(prev).add(r.id));
            } else {
              failed++;
            }
          }
          current += batch.length;
          setSyncProgress({ current, total: ids.length, failed });
        } else {
          failed += batch.length;
          current += batch.length;
          setSyncProgress({ current, total: ids.length, failed });
        }
      } catch {
        failed += batch.length;
        current += batch.length;
        setSyncProgress({ current, total: ids.length, failed });
      }
    }

    setSyncRunning(false);
    toast.success(`Hoàn tất! ${current - failed}/${ids.length} icon đã đồng bộ`);
    // Refresh base URL
    if (!syncBaseUrl) void loadSynced();
  };

  const syncAllFromLibrary = (overwrite = false) => {
    if (allIds.length === 0) {
      toast.error("Hãy tải thư viện trước");
      return;
    }
    const toSync = overwrite ? allIds : allIds.filter((id) => !syncedIds.has(id));
    if (toSync.length === 0) {
      toast.success("Tất cả đã được đồng bộ");
      return;
    }
    void startSync(toSync, overwrite);
  };

  const syncFavorites = () => {
    if (favorites.length === 0) {
      toast.error("Chưa có icon nào trong yêu thích");
      return;
    }
    const toSync = favorites.map((f) => f.id).filter((id) => !syncedIds.has(id));
    if (toSync.length === 0) {
      toast.success("Tất cả đã được đồng bộ");
      return;
    }
    void startSync(toSync);
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
    navigator.clipboard.writeText(absoluteUrl(itemId)).then(() => {
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

  // Tải file PNG qua proxy same-origin (buộc download thật, không mở tab)
  const downloadIcon = (itemId: string) => {
    const a = document.createElement("a");
    a.href = `/api/ff-icon/${encodeURIComponent(itemId)}.png`;
    a.download = `${itemId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Đang tải ${itemId}.png`);
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

  const renameFavorite = (itemId: string, newLabel: string) => {
    setFavorites((prev) => {
      const next = prev.map((f) => f.id === itemId ? { ...f, label: newLabel.trim() || undefined } : f);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(newLabel.trim() ? `Đã đặt tên: ${newLabel}` : "Đã xóa tên");
  };

  const exportFavorites = () => {
    if (favorites.length === 0) { toast.error("Chưa có favorites để export"); return; }
    const data = JSON.stringify(favorites, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ff-items-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${favorites.length} favorites`);
  };

  const importFavorites = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const data = JSON.parse(text) as Favorite[];
        if (!Array.isArray(data)) throw new Error("Invalid format");
        // Validate items
        const valid = data.filter((f): f is Favorite =>
          typeof f === "object" && f !== null && typeof f.id === "string");
        if (valid.length === 0) throw new Error("No valid items");

        setFavorites((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newOnes = valid.filter((f) => !existingIds.has(f.id));
          const next = [...newOnes, ...prev];
          localStorage.setItem(FAV_KEY, JSON.stringify(next));
          return next;
        });
        toast.success(`Đã import ${valid.length} items (${valid.length - favorites.length} mới)`);
      } catch (err) {
        toast.error(`File không hợp lệ: ${String(err).slice(0, 50)}`);
      }
    };
    reader.readAsText(file);
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
      list = list.filter((f) =>
        f.id.toLowerCase().includes(q) ||
        (f.label?.toLowerCase().includes(q) ?? false),
      );
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
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="space-y-1 min-w-0">
        <h1 className="font-heading text-lg sm:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
          <ImageIcon className="size-5 text-primary dark:text-amber-400 shrink-0" />
          <span className="truncate">Free Fire Items Lookup</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Tra cứu icon Free Fire bằng Item ID
        </p>
      </div>

      {/* Sync to Supabase Storage */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Server className="size-4 sm:size-5 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Đồng bộ về server
            </h2>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Tải icon từ GitHub về Supabase Storage
            </p>
            {syncedIds.size > 0 && (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Đã đồng bộ {syncedIds.size.toLocaleString()} icon
              </p>
            )}
          </div>
        </div>

        {/* Action buttons — full row to allow proper wrapping on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => syncAllFromLibrary(false)}
            disabled={syncRunning || allIds.length === 0}
            title={allIds.length === 0 ? "Hãy tải thư viện trước" : "Đồng bộ những icon chưa có"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {syncRunning ? <Loader2 className="size-3.5 animate-spin" /> : <CloudDownload className="size-3.5" />}
            <span>Đồng bộ toàn bộ</span>
            {allIds.length > 0 && (
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                {(allIds.length - syncedIds.size).toLocaleString()}
              </span>
            )}
          </button>
          <button
            onClick={() => syncFavorites()}
            disabled={syncRunning || favorites.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            <Star className="size-3.5" />
            <span>Yêu thích</span>
          </button>
          {syncRunning && (
            <button
              onClick={() => { syncAbort.current = true; }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/20"
            >
              <Pause className="size-3.5" /> Dừng
            </button>
          )}
        </div>

        {/* Progress bar */}
        {syncProgress && syncRunning && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-foreground tabular-nums">
                {syncProgress.current.toLocaleString()} / {syncProgress.total.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {syncProgress.failed > 0 && <span className="text-rose-500">{syncProgress.failed} lỗi · </span>}
                {Math.round((syncProgress.current / syncProgress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-500/10">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Public URL info */}
        {syncBaseUrl && (
          <div className="rounded-xl border border-border bg-background/60 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL từ server</p>
            <p className="font-mono text-[11px] break-all text-foreground">
              {syncBaseUrl}<span className="text-emerald-500">{"{id}"}.png</span>
            </p>
          </div>
        )}
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
          <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4 space-y-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-background flex items-center justify-center">
                {loaded[debouncedId] === "fail" ? (
                  <X className="size-6 text-destructive" />
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
                      <Loader2 className="absolute size-5 animate-spin text-muted-foreground" />
                    )}
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {loaded[debouncedId] === "fail" ? "Không tìm thấy" : "Item ID"}
                </p>
                <p className="font-mono font-bold text-sm break-all">{debouncedId}</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all line-clamp-2">{previewUrl}</p>
              </div>
            </div>

            {/* Actions — full row, wrap on mobile */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => copyUrl(debouncedId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {copiedId === debouncedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                <span>{copiedId === debouncedId ? "Đã copy" : "Copy URL"}</span>
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
                <span>{isFavorited(debouncedId) ? "Đã lưu" : "Lưu"}</span>
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="size-3.5" /> Mở
              </a>
              <button
                onClick={() => downloadIcon(debouncedId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:border-emerald-500/40 hover:text-emerald-500 transition-colors"
              >
                <Download className="size-3.5" /> Tải
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Catalog Manager */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
              <Database className="size-4 sm:size-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xs sm:text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Catalog Công Khai
              </h2>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                Items hiển thị cho người dùng tại /items · {catalog.length.toLocaleString()} items
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddCatalogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-3.5" /> Thêm item
          </button>
        </div>

        {catalogLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Đang tải...
          </div>
        )}

        {!catalogLoading && catalog.length > 0 && (
          <div className="space-y-3">
            {/* Search + Category filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Tìm theo ID hoặc tên..."
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {catalogSearch && (
                  <button onClick={() => setCatalogSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCatalogFilter("all")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                    catalogFilter === "all"
                      ? "bg-foreground text-background"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tất cả ({catalog.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = catalogCategoryCounts[cat.key] ?? 0;
                  if (count === 0) return null;
                  const Icon = cat.icon;
                  const isActive = catalogFilter === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setCatalogFilter(cat.key)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        isActive ? `${cat.bg} ${cat.color} border ${cat.border}` : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-2.5" />
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items grid */}
            {(() => {
              const limit = showAllCatalog ? filteredCatalog.length : 24;
              const visible = filteredCatalog.slice(0, limit);

              if (filteredCatalog.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Filter className="size-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Không tìm thấy item phù hợp</p>
                  </div>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {visible.map((item) => {
                      const cat = item.category ? CAT_MAP.get(item.category as CategoryKey) : null;
                      return (
                        <div key={item.id} className="group relative rounded-xl border border-border bg-card p-2 space-y-1">
                          <div className="relative aspect-square overflow-hidden rounded-lg bg-background flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={syncBaseUrl ? `${syncBaseUrl}${item.id}.png` : buildUrl(item.id)}
                              alt={item.label ?? item.id}
                              className="size-full object-contain p-1"
                              loading="lazy"
                            />
                            {cat && (
                              <span className={`absolute left-1 top-1 flex size-5 items-center justify-center rounded ${cat.bg} ${cat.color}`} title={cat.label}>
                                <cat.icon className="size-3" />
                              </span>
                            )}
                            {!item.is_public && (
                              <span className="absolute right-1 top-1 rounded bg-rose-500/20 text-rose-500 px-1 py-0.5 text-[8px] font-bold">RIÊNG</span>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                              <button onClick={() => downloadIcon(item.id)} title="Tải ảnh"
                                className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-emerald-500/40 hover:text-emerald-500">
                                <Download className="size-3" />
                              </button>
                              <button onClick={() => setEditCatalogItem(item)} title="Sửa"
                                className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-blue-500/40 hover:text-blue-500">
                                <Pencil className="size-3" />
                              </button>
                              <button onClick={() => deleteCatalogItem(item.id)} title="Xóa"
                                className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-destructive/40 hover:text-destructive">
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                          {item.label && <p className="truncate text-[10px] font-bold text-foreground">{item.label}</p>}
                          <p className="truncate font-mono text-[9px] text-muted-foreground">{item.id}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show more/less */}
                  {filteredCatalog.length > 24 && (
                    <div className="flex justify-center pt-1">
                      <button
                        onClick={() => setShowAllCatalog((v) => !v)}
                        className="rounded-xl border border-border px-4 py-1.5 text-[11px] font-semibold hover:bg-muted transition-colors"
                      >
                        {showAllCatalog
                          ? `Ẩn bớt (đang hiện ${filteredCatalog.length.toLocaleString()})`
                          : `Xem tất cả (còn ${(filteredCatalog.length - 24).toLocaleString()} items)`}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {!catalogLoading && catalog.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Database className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Chưa có item nào trong catalog</p>
            <p className="text-[11px] text-muted-foreground/70">Bấm &quot;Thêm item&quot; hoặc chọn từ Library bên dưới</p>
          </div>
        )}
      </div>

      {/* Library — Toàn bộ items từ jsDelivr */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <div className="space-y-1 min-w-0">
          <h2 className="font-heading text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Database className="size-4 text-primary dark:text-amber-400 shrink-0" />
            <span className="truncate">Thư viện Items</span>
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void loadLibrary(false)}
            disabled={allLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {allLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
            {allLoading ? "Đang tải..." : allIds.length > 0 ? "Đã tải" : "Tải thư viện"}
          </button>
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
                        onDownload={() => downloadIcon(itemId)}
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
                onDownload={() => downloadIcon(itemId)}
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
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <Star className="size-3.5 fill-current" /> Đã lưu ({favorites.length})
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={exportFavorites}
                title="Export ra file JSON"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <Download className="size-3" /> Export
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                title="Import từ file JSON"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <Upload className="size-3" /> Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFavorites(file);
                  e.target.value = "";
                }}
              />
            </div>
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
                  placeholder="Tìm theo ID hoặc tên..."
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
                  label={fav.label}
                  onCopy={() => copyUrl(fav.id)}
                  onDownload={() => downloadIcon(fav.id)}
                  onCopyId={() => copyId(fav.id)}
                  onFavorite={() => toggleFavorite(fav.id)}
                  onTag={() => setTagModalId(fav.id)}
                  onRename={() => setRenameModal({ id: fav.id, label: fav.label ?? "" })}
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
                onDownload={() => downloadIcon(r.id)}
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

      {/* Edit catalog item modal */}
      {editCatalogItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setEditCatalogItem(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Sửa Catalog</p>
                <p className="text-sm font-bold text-foreground truncate">{editCatalogItem.label ?? "(chưa đặt tên)"}</p>
                <p className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">{editCatalogItem.id}</p>
              </div>
              <button onClick={() => setEditCatalogItem(null)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="flex items-center justify-center rounded-xl border border-border bg-muted/30 p-4">
                <div className="relative size-20 overflow-hidden rounded-lg bg-background flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={syncBaseUrl ? `${syncBaseUrl}${editCatalogItem.id}.png` : buildUrl(editCatalogItem.id)} alt={editCatalogItem.id} className="size-full object-contain p-1" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tên hiển thị</label>
                <input
                  type="text"
                  value={editCatalogItem.label ?? ""}
                  onChange={(e) => setEditCatalogItem({ ...editCatalogItem, label: e.target.value || null })}
                  placeholder="Tên item..."
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loại</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = editCatalogItem.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setEditCatalogItem({ ...editCatalogItem, category: cat.key })}
                        className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-left text-[11px] font-bold transition-all ${
                          isActive ? `${cat.bg} ${cat.border} ${cat.color}` : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <Icon className={`size-3.5 ${isActive ? "" : cat.color}`} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCatalogItem.is_public}
                  onChange={(e) => setEditCatalogItem({ ...editCatalogItem, is_public: e.target.checked })}
                  className="size-4 rounded border-border"
                />
                <span className="text-xs font-semibold">Hiển thị công khai tại <code className="font-mono text-[10px]">/items</code></span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditCatalogItem(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">
                  Hủy
                </button>
                <button
                  onClick={() => updateCatalogItem(editCatalogItem)}
                  disabled={catalogSaving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {catalogSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to catalog modal */}
      {addCatalogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setAddCatalogModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Catalog</p>
                <p className="text-sm font-bold text-foreground">Thêm item vào danh mục công khai</p>
              </div>
              <button onClick={() => setAddCatalogModal(false)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              {catalogForm.id.trim() && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-background flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={buildUrl(catalogForm.id.trim())} alt={catalogForm.id} className="size-full object-contain p-1" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{catalogForm.label || "(chưa đặt tên)"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{catalogForm.id}</p>
                    <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${CAT_MAP.get(catalogForm.category)?.bg} ${CAT_MAP.get(catalogForm.category)?.color}`}>
                      {CAT_MAP.get(catalogForm.category)?.label}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item ID *</label>
                <input
                  type="text"
                  value={catalogForm.id}
                  onChange={(e) => setCatalogForm({ ...catalogForm, id: e.target.value })}
                  placeholder="VD: 211000234"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tên hiển thị</label>
                <input
                  type="text"
                  value={catalogForm.label}
                  onChange={(e) => setCatalogForm({ ...catalogForm, label: e.target.value })}
                  placeholder="VD: AWM Skull Cleaver, Alok, Bom keo..."
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loại</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = catalogForm.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setCatalogForm({ ...catalogForm, category: cat.key })}
                        className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-left text-[11px] font-bold transition-all ${
                          isActive ? `${cat.bg} ${cat.border} ${cat.color}` : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <Icon className={`size-3.5 ${isActive ? "" : cat.color}`} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catalogForm.is_public}
                  onChange={(e) => setCatalogForm({ ...catalogForm, is_public: e.target.checked })}
                  className="size-4 rounded border-border"
                />
                <span className="text-xs font-semibold">Hiển thị công khai tại <code className="font-mono text-[10px]">/items</code></span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setAddCatalogModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">
                  Hủy
                </button>
                <button
                  onClick={saveCatalogItem}
                  disabled={catalogSaving || !catalogForm.id.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {catalogSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setRenameModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Đặt tên icon</p>
                <p className="text-sm font-bold text-foreground">Tên tùy chỉnh</p>
                <p className="font-mono text-[10px] text-muted-foreground/70 mt-0.5 truncate">{renameModal.id}</p>
              </div>
              <button onClick={() => setRenameModal(null)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={renameModal.label}
                onChange={(e) => setRenameModal({ ...renameModal, label: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameFavorite(renameModal.id, renameModal.label);
                    setRenameModal(null);
                  }
                }}
                placeholder="VD: AWM Skull Cleaver, Alok, Drop Box..."
                maxLength={60}
                autoFocus
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Tên này sẽ hiển thị thay vì ID. Bỏ trống để xóa tên.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setRenameModal(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">
                  Hủy
                </button>
                <button onClick={() => { renameFavorite(renameModal.id, renameModal.label); setRenameModal(null); }}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk tag modal */}
      {bulkTagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setBulkTagModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Phân loại hàng loạt</p>
                <p className="text-sm font-bold text-foreground">{selectedIds.size} icon đã chọn</p>
              </div>
              <button onClick={() => setBulkTagModal(false)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Catalog public actions */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  <Database className="size-3" /> Lưu vào Catalog Công Khai (DB)
                </p>
                <p className="text-[10px] text-muted-foreground">Hiển thị tại /items cho mọi người dùng</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={`cat-${cat.key}`}
                        onClick={() => pushSelectedToCatalog(cat.key)}
                        className={`flex items-center gap-1.5 rounded-lg border ${cat.border} bg-card p-2 text-left transition-all hover:scale-[1.02]`}
                      >
                        <Icon className={`size-3.5 shrink-0 ${cat.color}`} />
                        <span className="text-[10px] font-bold truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  <Star className="size-3" /> Hoặc lưu vào Favorites (chỉ của bạn)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={`fav-${cat.key}`}
                        onClick={() => bulkAddToFavorites(cat.key)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2 text-left transition-all hover:scale-[1.02] hover:border-foreground/30"
                      >
                        <Icon className={`size-3.5 shrink-0 ${cat.color}`} />
                        <span className="text-[10px] font-bold truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
  id, isFavorited, category, label, selectMode, selected, onToggleSelect,
  onCopy, onCopyId, onFavorite, onTag, onRename, onRemove, onSelect, onDownload, copied,
}: {
  id: string;
  isFavorited: boolean;
  category?: CategoryKey;
  label?: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onCopy: () => void;
  onCopyId: () => void;
  onFavorite: () => void;
  onTag?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
  onSelect?: () => void;
  onDownload?: () => void;
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
          {onDownload && (
            <button onClick={onDownload} title="Tải ảnh PNG"
              className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-emerald-500/40 hover:text-emerald-500">
              <Download className="size-3" />
            </button>
          )}
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
          {onRename && (
            <button onClick={onRename} title="Đặt tên"
              className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-blue-500/40 hover:text-blue-500">
              <Pencil className="size-3" />
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
        className="block w-full text-left transition-colors hover:text-foreground"
      >
        {label && (
          <p className="truncate text-[10px] font-bold text-foreground leading-tight">{label}</p>
        )}
        <p className={`truncate font-mono text-[10px] leading-tight ${label ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
          {id}
        </p>
      </button>
    </div>
  );
}
