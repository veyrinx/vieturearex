"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Clock, Check, ShoppingCart, Flame } from "lucide-react";
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
  if (item.featured)
    return {
      fill: "from-amber-500/35 via-orange-600/20 to-transparent",
      edge: "border-amber-300/70",
      glow: "shadow-[0_0_28px_rgba(251,191,36,0.25)]",
      accent: "text-amber-300",
      label: "Huyền thoại",
      ribbon: "bg-amber-400/90 text-slate-900",
    };
  if (item.type === "membership")
    return {
      fill: "from-violet-600/35 via-fuchsia-600/18 to-transparent",
      edge: "border-violet-300/50",
      glow: "",
      accent: "text-violet-200",
      label: "Sử thi",
      ribbon: "bg-violet-400/90 text-slate-900",
    };
  return {
    fill: "from-sky-600/35 via-blue-700/18 to-transparent",
    edge: "border-sky-300/45",
    glow: "",
    accent: "text-sky-200",
    label: "Hiếm",
    ribbon: "bg-sky-400/90 text-slate-900",
  };
}

/** Kim cương Free Fire (SVG nhỏ, tự vẽ để khỏi phụ thuộc ảnh). */
function Diamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="#22d3ee" />
      <path d="M6 3h12l4 6H2l4-6z" fill="#67e8f9" />
      <path d="M12 21 2 9h20L12 21z" fill="#0891b2" opacity=".55" />
      <path d="M9 3 7 9l5 12M15 3l2 6-5 12" stroke="#0e7490" strokeWidth=".8" fill="none" opacity=".6" />
    </svg>
  );
}

/** Đếm ngược tới đợt reset Prime kế tiếp (đầu tháng). */
function useResetCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const d = new Date(now);
  const target = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return `${days}d ${hours}h ${mins}m`;
}

export function PrimeStore({ items }: { items: PrimeItem[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const visible = useMemo(() => (tab === "all" ? items : items.filter((i) => i.type === tab)), [items, tab]);
  const countdown = useResetCountdown();

  return (
    <div
      className="relative overflow-hidden rounded-[26px] border-2 border-amber-400/50 bg-[#0d1420] p-3 shadow-[0_0_50px_rgba(251,191,36,0.12)] sm:p-4"
      style={{ backgroundImage: "radial-gradient(120% 60% at 50% -10%, rgba(251,191,36,0.12), transparent 60%)" }}
    >
      {/* Header shop */}
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-heading text-2xl font-black uppercase italic tracking-tight sm:text-3xl">
            <span className="text-slate-100">Prime</span>{" "}
            <span className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">Store</span>
          </h2>
          <span className="hidden text-[11px] font-bold text-amber-100/50 sm:inline">{items.length} vật phẩm</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/40 px-3 py-1 font-heading text-xs font-bold tabular-nums text-amber-200"
          title="Đếm ngược tới đợt reset đầu tháng"
        >
          <Clock className="size-3.5" /> Reset {countdown ? `sau ${countdown}` : "--"}
        </span>
      </div>

      {/* Tabs lọc */}
      <div className="mb-4 flex flex-wrap gap-1.5 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
              tab === t.key
                ? "bg-amber-400 text-slate-900 shadow"
                : "text-amber-100/50 hover:text-amber-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Các banner xếp chồng */}
      <div className="space-y-3">
        {visible.map((item) => {
          const r = rarity(item);
          const Icon = item.type === "membership" ? Crown : Clock;
          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex h-28 overflow-hidden rounded-2xl border bg-[#111a28] transition-transform duration-300 hover:scale-[1.01] sm:h-32",
                r.edge, r.glow,
              )}
            >
              {/* Nền gradient rarity + vệt chéo */}
              <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r", r.fill)} />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-30"
                style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.05) 22px 24px)" }}
              />
              {/* Vệt sáng quét khi hover */}
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {item.featured && (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow">
                  <Flame className="size-2.5" /> Hot
                </span>
              )}

              {/* Nhãn độ hiếm */}
              <span className={cn("absolute right-3 top-3 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest shadow", r.ribbon)}>
                {r.label}
              </span>

              {/* Thông tin bên trái */}
              <div className="relative z-10 flex flex-1 flex-col justify-center gap-1 p-4 pr-2">
                <p className="font-heading text-base font-black uppercase tracking-tight text-slate-50 line-clamp-1 sm:text-lg">
                  {item.name}
                </p>
                {item.duration && (
                  <p className={cn("text-[11px] font-semibold", r.accent)}>{item.duration}</p>
                )}
                {item.type === "membership" && item.perks && item.perks.length > 0 && (
                  <ul className="mt-0.5 hidden space-y-0.5 sm:block">
                    {item.perks.slice(0, 2).map((p) => (
                      <li key={p} className="flex items-center gap-1 text-[10px] leading-tight text-slate-300">
                        <Check className="size-2.5 shrink-0 text-emerald-400" /> <span className="line-clamp-1">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Giá kim cương */}
                <div className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 ring-1 ring-white/10">
                  <Diamond className="size-4" />
                  <span className="font-heading text-sm font-black tabular-nums text-cyan-100">
                    {item.price.toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>

              {/* Ảnh vật phẩm bên phải */}
              <div className="relative z-10 flex w-32 shrink-0 items-center justify-center sm:w-44">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <Icon className={cn("size-14 drop-shadow-lg transition-transform duration-300 group-hover:scale-110", r.accent)} />
                )}
              </div>

              {/* Nút mua — luôn hiện (chạm được trên mobile), sáng lên khi hover */}
              <button
                disabled
                title="Sắp mở bán"
                aria-label={`Mua ${item.name} — sắp mở bán`}
                className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-lg bg-amber-400/90 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-900 opacity-80 shadow transition-all duration-200 group-hover:bg-amber-400 group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="size-3" /> Mua
              </button>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-amber-400/30 p-10 text-center text-sm text-amber-100/50">
          Chưa có vật phẩm trong mục này.
        </div>
      )}
    </div>
  );
}
