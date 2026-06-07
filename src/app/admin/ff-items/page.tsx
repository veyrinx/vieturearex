"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search, Copy, Check, X, Image as ImageIcon, ExternalLink,
  Star, Trash2, Plus, Loader2,
} from "lucide-react";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/ShahGCreator/icon@main/PNG";

function buildUrl(id: string) {
  return `${ICON_BASE}/${encodeURIComponent(id.trim())}.png`;
}

type Recent = { id: string; ts: number };
type Favorite = { id: string; label?: string };

const RECENT_KEY = "ff-items:recent";
const FAV_KEY = "ff-items:favorites";

export default function FFItemsPage() {
  const [id, setId] = useState("");
  const [debouncedId, setDebouncedId] = useState("");
  const [loaded, setLoaded] = useState<Record<string, "ok" | "fail" | "loading">>({});
  const [recents, setRecents] = useState<Recent[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[];
      const f = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as Favorite[];
      setRecents(Array.isArray(r) ? r : []);
      setFavorites(Array.isArray(f) ? f : []);
    } catch { /* ignore */ }
  }, []);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedId(id.trim()), 300);
    return () => clearTimeout(t);
  }, [id]);

  // Add to recents when ID loads successfully
  const handleImageLoad = (itemId: string) => {
    setLoaded((prev) => ({ ...prev, [itemId]: "ok" }));
    setRecents((prev) => {
      const next = [{ id: itemId, ts: Date.now() }, ...prev.filter((r) => r.id !== itemId)].slice(0, 20);
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

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === itemId);
      const next = exists ? prev.filter((f) => f.id !== itemId) : [{ id: itemId }, ...prev];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      toast.success(exists ? "Đã bỏ yêu thích" : "Đã thêm yêu thích");
      return next;
    });
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

  const previewUrl = useMemo(() => debouncedId ? buildUrl(debouncedId) : null, [debouncedId]);

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
          <div className="flex gap-2">
            <div className="relative flex-1">
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
                onCopy={() => copyUrl(itemId)}
                onCopyId={() => copyId(itemId)}
                onFavorite={() => toggleFavorite(itemId)}
                copied={copiedId === itemId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <Star className="size-3.5 fill-current" /> Đã lưu ({favorites.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {favorites.map((fav) => (
              <ItemThumb
                key={fav.id}
                id={fav.id}
                isFavorited={true}
                onCopy={() => copyUrl(fav.id)}
                onCopyId={() => copyId(fav.id)}
                onFavorite={() => toggleFavorite(fav.id)}
                onSelect={() => setId(fav.id)}
                copied={copiedId === fav.id}
              />
            ))}
          </div>
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
                onCopy={() => copyUrl(r.id)}
                onCopyId={() => copyId(r.id)}
                onFavorite={() => toggleFavorite(r.id)}
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
            <li>Click ngôi sao để lưu icon yêu thích vào danh sách</li>
            <li>Click Copy URL để dán vào bài viết / wiki / cosmetics</li>
            <li>Dùng &quot;Tra cứu hàng loạt&quot; để preview nhiều icon cùng lúc</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ItemThumb({
  id, isFavorited, onCopy, onCopyId, onFavorite, onRemove, onSelect, copied,
}: {
  id: string;
  isFavorited: boolean;
  onCopy: () => void;
  onCopyId: () => void;
  onFavorite: () => void;
  onRemove?: () => void;
  onSelect?: () => void;
  copied: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");
  const url = buildUrl(id);

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
          <button onClick={onFavorite} title={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
            className={`flex size-7 items-center justify-center rounded-lg border ${isFavorited ? "border-amber-500/40 bg-amber-500/10 text-amber-500" : "border-border bg-card"}`}>
            <Star className={`size-3 ${isFavorited ? "fill-current" : ""}`} />
          </button>
          {onRemove && (
            <button onClick={onRemove} title="Xóa khỏi gần đây"
              className="flex size-7 items-center justify-center rounded-lg bg-card border border-border hover:border-destructive/40 hover:text-destructive">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onCopyId}
        title={`Click để copy ID — ${onSelect ? "double click để chọn" : ""}`}
        onDoubleClick={onSelect}
        className="block w-full text-center font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate"
      >
        {id}
      </button>
    </div>
  );
}
