"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Search, X, Copy, Check, Grid2x2, ChevronLeft, ChevronRight, Loader2, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ─── Config ───────────────────────────────────────────────────────────────────
const CDN_URL            = "/api/ff-icon/"; // qua domain site (proxy + cache)
const ITEMS_PER_PAGE     = 80;
const SEARCH_DEBOUNCE_MS = 250;
const FAB_POS_KEY        = "fflib_fab_pos";
const ADMIN_ROLES = ["super_admin", "admin", "manager", "support"];

type Pos = { x: number; y: number };

const clampPos = (p: Pos): Pos => ({
  x: Math.max(8, Math.min(p.x, window.innerWidth - 64)),
  y: Math.max(8, Math.min(p.y, window.innerHeight - 64)),
});

export function IconLibraryFab() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const [ids, setIds] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState(CDN_URL);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  // ── Kiểm tra quyền admin ──
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users").select("role").eq("id", data.user.id).maybeSingle<{ role: string }>();
      if (profile?.role && ADMIN_ROLES.includes(profile.role)) setIsAdmin(true);
    });
  }, []);

  // ── Nạp vị trí ghim + dev mode ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAB_POS_KEY);
      const saved = raw ? (JSON.parse(raw) as Pos) : null;
      setPos(saved ? clampPos(saved) : { x: 16, y: window.innerHeight - 150 });
    } catch {
      setPos({ x: 16, y: window.innerHeight - 150 });
    }
  }, []);

  // ── Nạp danh sách icon (lazy khi mở lần đầu) ──
  const loadIcons = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    fetch("/api/ff-icons")
      .then((r) => r.json())
      .then((d: { ids?: string[]; baseUrl?: string }) => {
        setIds(d.ids ?? []);
        if (d.baseUrl) setBaseUrl(d.baseUrl);
        setLoaded(true);
      })
      .catch(() => toast.error("Không tải được danh sách icon"))
      .finally(() => setLoading(false));
  }, [loaded, loading]);

  useEffect(() => { if (open) loadIcons(); }, [open, loadIcons]);

  // ── Search debounce ──
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced]);

  const filtered = useMemo(
    () => (debounced ? ids.filter((x) => x.toLowerCase().includes(debounced)) : ids),
    [ids, debounced],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const slice = filtered.slice((curPage - 1) * ITEMS_PER_PAGE, curPage * ITEMS_PER_PAGE);

  const urlOf = (id: string) => `${baseUrl}${id}.png`;

  const copy = (text: string, id: string, kind: "URL" | "ID") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success(`Đã copy ${kind}`);
      setTimeout(() => setCopiedId(null), 1200);
    });
  };

  // ── Drag ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return;
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setPos(clampPos({ x: drag.current.ox + dx, y: drag.current.oy + dy }));
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.moved) {
      try { if (pos) localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos)); } catch { /**/ }
    } else {
      setOpen((o) => !o);
    }
  };

  // Ẩn trên trang /items vì đó đã là thư viện icon (FAB thừa)
  if (!isAdmin || !pos || pathname.startsWith("/items")) return null;

  return (
    <>
      {/* FAB kéo-thả */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[80] flex size-12 touch-none items-center justify-center rounded-2xl border border-white/40 bg-primary text-white shadow-lg dark:border-white/10 dark:bg-amber-500"
        title="Thư viện icon (admin) — kéo để ghim vị trí"
        aria-label="Thư viện icon"
      >
        <Grid2x2 className="size-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[81] mx-auto flex h-[70vh] max-h-[560px] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:left-4">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
            <GripVertical className="size-4 text-muted-foreground/50" />
            <span className="font-heading text-xs font-black uppercase tracking-wider text-foreground">
              Thư Viện Icon
            </span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary dark:bg-amber-400/10 dark:text-amber-400">
              {loaded ? filtered.length.toLocaleString() : "…"}
            </span>
            <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative shrink-0 border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Item ID..."
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-8 font-mono text-xs focus:border-primary focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải...
              </div>
            )}
            {!loading && slice.length === 0 && (
              <p className="py-10 text-center text-xs text-muted-foreground">Không có icon.</p>
            )}
            {!loading && slice.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {slice.map((id) => (
                  <div key={id} className="group relative">
                    <button
                      onClick={() => copy(urlOf(id), id, "URL")}
                      title={`Copy URL — ${id}`}
                      className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 transition hover:border-primary/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urlOf(id)} alt={id} loading="lazy" className="size-full object-contain p-1" />
                      <span className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        {copiedId === id ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-3.5 text-foreground" />}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer pagination */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border p-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={curPage === 1}
                className="rounded-lg border border-border p-1.5 disabled:opacity-30"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="font-mono text-[11px] tabular-nums">{curPage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={curPage === totalPages}
                className="rounded-lg border border-border p-1.5 disabled:opacity-30"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
