"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BellPlus,
  BellRing,
  Loader2,
  Search,
  SlidersHorizontal,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LISTING_KIND_LABEL, MIN_PRICE, formatVnd, type ListingKind } from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

type Watch = {
  id: string;
  label: string;
  keyword: string | null;
  kind: "account" | "item" | null;
  min_price: number | null;
  max_price: number | null;
};

const SORTS: { key: string; label: string }[] = [
  { key: "new", label: "Mới nhất" },
  { key: "price_asc", label: "Giá thấp → cao" },
  { key: "price_desc", label: "Giá cao → thấp" },
  { key: "popular", label: "Xem nhiều" },
];

/** Khoảng giá bấm nhanh — theo mức tiền người chơi hay tìm. */
const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Dưới 200k", max: 200_000 },
  { label: "200k – 500k", min: 200_000, max: 500_000 },
  { label: "500k – 1tr", min: 500_000, max: 1_000_000 },
  { label: "1tr – 3tr", min: 1_000_000, max: 3_000_000 },
  { label: "Trên 3tr", min: 3_000_000 },
];

/**
 * Thanh lọc của chợ. Trạng thái nằm hết trên URL nên người dùng chia sẻ được
 * link đúng bộ lọc mình đang xem, và nút back của trình duyệt vẫn đúng.
 */
export function ShopFilters({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const kind = sp.get("kind") ?? "";
  const sort = sp.get("sort") ?? "new";
  const q = sp.get("q") ?? "";
  const min = sp.get("min") ?? "";
  const max = sp.get("max") ?? "";
  const onSale = sp.get("sale") === "1";

  const [search, setSearch] = useState(q);
  const [open, setOpen] = useState(false);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [savingWatch, setSavingWatch] = useState(false);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/shop/watchlist")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: Watch[] }) => setWatches(d.items ?? []))
      .catch(() => { /* im lặng */ });
  }, [signedIn]);

  const apply = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(next.toString() ? `/shop?${next}` : "/shop"));
  };

  const hasFilter = !!(kind || q || min || max || onSale || sort !== "new");

  const saveWatch = async () => {
    setSavingWatch(true);
    try {
      const res = await fetch("/api/shop/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: q,
          kind: kind || null,
          minPrice: min ? Number(min) : null,
          maxPrice: max ? Number(max) : null,
        }),
      });
      const d = (await res.json()) as { error?: string; item?: Watch };
      if (!res.ok || !d.item) {
        toast.error(d.error ?? "Không lưu được bộ lọc.");
        return;
      }
      setWatches((w) => [d.item as Watch, ...w]);
      toast.success("Đã theo dõi. Có tin mới khớp là bạn được báo ngay.");
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSavingWatch(false);
    }
  };

  const removeWatch = async (id: string) => {
    setWatches((w) => w.filter((x) => x.id !== id));
    await fetch(`/api/shop/watchlist?id=${id}`, { method: "DELETE" }).catch(() => null);
  };

  const applyWatch = (w: Watch) =>
    apply({
      q: w.keyword ?? undefined,
      kind: w.kind ?? undefined,
      min: w.min_price ? String(w.min_price) : undefined,
      max: w.max_price ? String(w.max_price) : undefined,
    });

  return (
    <div className="space-y-2.5">
      {/* Hàng 1: tìm + loại + mở bộ lọc */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: search.trim() || undefined });
          }}
          className="relative min-w-[13rem] flex-1"
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm acc, skin, nhân vật…"
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-9 text-sm outline-none focus:border-primary/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); apply({ q: undefined }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Xoá tìm kiếm"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {(["", "account", "item"] as (ListingKind | "")[]).map((k) => (
          <button
            key={k || "all"}
            onClick={() => apply({ kind: k || undefined })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              kind === k
                ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
            )}
          >
            {k === "" ? "Tất cả" : LISTING_KIND_LABEL[k as ListingKind]}
          </button>
        ))}

        {/* Lọc nhanh tin đang giảm — nằm cùng hàng với loại hàng vì đây là thứ
            người mua bấm nhiều nhất, không đáng phải mở bảng lọc mới thấy. */}
        <button
          onClick={() => apply({ sale: onSale ? undefined : "1" })}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
            onSale
              ? "border-red-500/50 bg-red-500/10 text-red-500"
              : "border-border bg-muted/40 text-muted-foreground hover:border-red-500/40 hover:text-red-500",
          )}
        >
          <TicketPercent className="size-3.5" /> Đang giảm
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
            open || min || max
              ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:text-amber-300"
              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
          )}
        >
          <SlidersHorizontal className="size-3.5" /> Bộ lọc
          {pending && <Loader2 className="size-3 animate-spin" />}
        </button>
      </div>

      {/* Hàng 2: bảng lọc chi tiết */}
      {open && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5">
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              Khoảng giá
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((p) => {
                const active = String(p.min ?? "") === min && String(p.max ?? "") === max;
                return (
                  <button
                    key={p.label}
                    onClick={() =>
                      apply({
                        min: active ? undefined : p.min ? String(p.min) : undefined,
                        max: active ? undefined : p.max ? String(p.max) : undefined,
                      })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:text-amber-300"
                        : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                inputMode="numeric"
                defaultValue={min}
                key={`min-${min}`}
                onBlur={(e) => apply({ min: e.target.value.replace(/\D/g, "") || undefined })}
                placeholder={`Từ ${formatVnd(MIN_PRICE)}`}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary/50"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                inputMode="numeric"
                defaultValue={max}
                key={`max-${max}`}
                onBlur={(e) => apply({ max: e.target.value.replace(/\D/g, "") || undefined })}
                placeholder="Đến"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              Sắp xếp
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => apply({ sort: s.key === "new" ? undefined : s.key })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                    sort === s.key
                      ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:text-amber-300"
                      : "border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {hasFilter && (
              <button
                onClick={() => { setSearch(""); startTransition(() => router.replace("/shop")); }}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
              >
                Xoá hết bộ lọc
              </button>
            )}
            {signedIn && hasFilter && (
              <button
                onClick={() => void saveWatch()}
                disabled={savingWatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
              >
                {savingWatch ? <Loader2 className="size-3 animate-spin" /> : <BellPlus className="size-3" />}
                Theo dõi bộ lọc này
              </button>
            )}
            {!signedIn && (
              <p className="text-[11px] text-muted-foreground">
                Đăng nhập để được báo khi có tin mới khớp bộ lọc.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bộ lọc đang theo dõi */}
      {watches.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            <BellRing className="size-3" /> Đang theo dõi
          </span>
          {watches.map((w) => (
            <span
              key={w.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-muted-foreground"
            >
              <button onClick={() => applyWatch(w)} className="hover:text-primary">
                {w.label}
              </button>
              <button
                onClick={() => void removeWatch(w.id)}
                className="rounded-full p-0.5 transition hover:bg-red-500/10 hover:text-red-500"
                aria-label="Bỏ theo dõi"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
