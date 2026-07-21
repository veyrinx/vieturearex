"use client";

import { useMemo, useState } from "react";
import { Crown, Gem, Clock, Check, Sparkles, ShoppingCart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrimeItem } from "@/lib/constants/store";

type Tab = "all" | "membership" | "pack";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "membership", label: "Thành viên" },
  { key: "pack", label: "Gói thời hạn" },
];

/** Rarity: featured = huyền thoại (vàng), membership = sử thi (tím), pack = hiếm (lam). */
function rarity(item: PrimeItem) {
  if (item.featured) return { border: "border-amber-400/60", glow: "shadow-[0_0_24px_rgba(251,191,36,0.28)]", panel: "from-amber-500 to-orange-600", ring: "ring-amber-400/40" };
  if (item.type === "membership") return { border: "border-violet-400/50", glow: "shadow-[0_0_20px_rgba(167,139,250,0.22)]", panel: "from-violet-500 to-fuchsia-600", ring: "ring-violet-400/30" };
  return { border: "border-sky-400/40", glow: "", panel: "from-sky-500 to-blue-600", ring: "ring-sky-400/30" };
}

function Price({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-heading text-sm font-black tabular-nums text-foreground">
      <Gem className="size-3.5 text-sky-400" /> {value.toLocaleString("vi-VN")}
    </span>
  );
}

export function PrimeStore({ items }: { items: PrimeItem[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const visible = useMemo(() => (tab === "all" ? items : items.filter((i) => i.type === tab)), [items, tab]);

  return (
    <div className="space-y-5">
      {/* Thanh top kiểu shop: số dư giả lập + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-card to-muted/20 px-4 py-3">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-500">
          <Gem className="size-3.5" /> Kim cương
        </span>
      </div>

      {/* Lưới item kiểu cửa hàng game */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => {
          const r = rarity(item);
          const Icon = item.type === "membership" ? Crown : Clock;
          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-card transition-all duration-300 hover:-translate-y-1",
                r.border, r.glow,
              )}
            >
              {/* Badge */}
              {item.featured && (
                <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow">
                  <Flame className="size-2.5" /> Hot
                </span>
              )}

              {/* Panel icon (gradient theo rarity) */}
              <div className={cn("relative flex h-24 items-center justify-center bg-gradient-to-br", r.panel)}>
                <div className="pointer-events-none absolute inset-0 opacity-25"
                  style={{ backgroundImage: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.6), transparent 60%)" }} />
                <Icon className="size-10 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
                <Sparkles className="absolute right-2 top-2 size-3.5 text-white/50" />
              </div>

              {/* Thân */}
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="font-heading text-sm font-black uppercase tracking-tight text-foreground line-clamp-1">{item.name}</p>
                {item.duration && <p className="text-[11px] text-muted-foreground line-clamp-1">{item.duration}</p>}
                {item.type === "membership" && item.perks && item.perks.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {item.perks.slice(0, 3).map((p) => (
                      <li key={p} className="flex items-start gap-1 text-[10px] leading-tight text-muted-foreground">
                        <Check className="mt-0.5 size-2.5 shrink-0 text-emerald-500" /> <span className="line-clamp-1">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer giá + nút mua */}
              <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-border p-2.5">
                <Price value={item.price} />
                <button
                  disabled
                  title="Sắp mở"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/90 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingCart className="size-3" /> Mua
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa có vật phẩm trong mục này.
        </div>
      )}
    </div>
  );
}
