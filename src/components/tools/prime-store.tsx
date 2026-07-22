"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Check, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_BG, RARITY_LABEL, type PrimeItem, type PrimeRarity } from "@/lib/constants/store";

type Tab = "all" | "membership" | "pack";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "membership", label: "Thành viên" },
  { key: "pack", label: "Gói thời hạn" },
];

const rarityOf = (i: PrimeItem): PrimeRarity => i.rarity ?? (i.featured ? "ARTIFACT" : "COMMON");

/** Đếm ngược tới đợt reset Prime kế tiếp (đầu tháng), khớp định dạng "Xd Yh Zm". */
function useResetCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const d = new Date(now);
  const diff = Math.max(0, new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - now);
  return `${Math.floor(diff / 86_400_000)}d ${Math.floor((diff % 86_400_000) / 3_600_000)}h ${Math.floor((diff % 3_600_000) / 60_000)}m`;
}

export function PrimeStore({ items }: { items: PrimeItem[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [active, setActive] = useState<PrimeItem | null>(null);
  const visible = useMemo(() => (tab === "all" ? items : items.filter((i) => i.type === tab)), [items, tab]);
  const countdown = useResetCountdown();

  // Đóng modal bằng phím Esc + khóa cuộn nền khi modal mở.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [active]);

  return (
    <div className="space-y-3">
      <style>{`@keyframes primeTitleShine{to{background-position:200% center}}
@keyframes primeModalPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Tiêu đề + đếm ngược */}
      <div className="flex items-end justify-between gap-3 px-1">
        <h2
          className="font-heading text-[clamp(1.4rem,5vw,2.2rem)] font-black uppercase leading-tight text-transparent"
          style={{
            backgroundImage: "linear-gradient(to right,#fff,#FFD700,#fff)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            animation: "primeTitleShine 3s linear infinite",
          }}
        >
          Prime Store
        </h2>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[20px] border border-amber-400/30 bg-black/60 px-3 py-1 text-sm font-bold text-[#FFD700]">
          <Clock className="size-4" /> {countdown ?? "--"}
        </span>
      </div>

      {/* Lọc theo loại */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors",
              tab === t.key ? "bg-[#FFD700] text-slate-900 shadow" : "bg-black/40 text-amber-100/60 hover:text-amber-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Khung cửa hàng + lớp phủ vật phẩm (tỉ lệ % lấy theo reference) */}
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/prime/FF_UI_Prime_Store.png" alt="" className="block h-auto w-full select-none" draggable={false} />

        <div className="absolute bottom-[6%] left-[4.5%] right-[4.5%] top-[12.5%] grid grid-cols-1 content-start gap-2.5 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-color:#FFD700_transparent] [scrollbar-width:thin]">
          {visible.map((item) => {
            const bg = RARITY_BG[rarityOf(item)];
            return (
              <button
                key={item.id}
                onClick={() => setActive(item)}
                className="relative flex aspect-[3.17/1] w-full items-center justify-center transition-transform duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/prime/FF_UI_Prime_Item${bg}.png`}
                  alt=""
                  className="absolute inset-0 z-[1] size-full rounded object-fill"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/prime/FF_UI_Prime_Item1.png"; }}
                />

                {/* Tên gói — reference chỉ có icon, ta cần tên vì đây là gói dịch vụ */}
                <span className="absolute left-[5%] top-[8%] z-[3] max-w-[55%] truncate text-left font-heading text-[11px] font-black uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-sm">
                  {item.name}
                </span>

                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="relative z-[2] max-h-[85%] max-w-[60%] object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                {/* Hộp giá kim cương */}
                <div className="absolute bottom-[8%] left-[5%] z-[3] flex items-center rounded-[20px] border border-white/10 bg-black/60 px-3 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/prime/icon-diamond.png" alt="" className="mr-1.5 size-[18px]" />
                  <span className="text-sm font-bold tabular-nums text-white sm:text-base">
                    {item.price.toLocaleString("vi-VN")}
                  </span>
                </div>
              </button>
            );
          })}

          {visible.length === 0 && (
            <p className="mt-6 text-center text-sm font-semibold text-white/70 drop-shadow">
              Chưa có vật phẩm trong mục này.
            </p>
          )}
        </div>
      </div>

      {/* Modal chi tiết */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,15,0.85)] p-5 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "primeModalPop .4s cubic-bezier(0.175,0.885,0.32,1.275)" }}
            className="relative w-full max-w-[450px] rounded-2xl border border-white/10 bg-[rgba(7,25,50,0.92)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <button
              onClick={() => setActive(null)}
              aria-label="Đóng"
              className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
            >
              <X className="size-5" />
            </button>

            <div className="relative mx-auto mb-4 flex aspect-[3.17/1] w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/prime/FF_UI_Prime_Item${RARITY_BG[rarityOf(active)]}.png`} alt="" className="absolute inset-0 size-full rounded object-fill" />
              {active.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.image} alt={active.name} className="relative max-h-[85%] max-w-[60%] object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]" />
              )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]">
              {RARITY_LABEL[rarityOf(active)]}
            </p>
            <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white">{active.name}</h3>
            {active.duration && <p className="mt-0.5 text-sm text-[#e0e8f2]/70">{active.duration}</p>}

            {active.perks && active.perks.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {active.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-[#e0e8f2]">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" /> {p}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center rounded-[20px] border border-white/10 bg-black/60 px-3 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/prime/icon-diamond.png" alt="" className="mr-1.5 size-5" />
                <span className="font-heading text-lg font-bold tabular-nums text-white">
                  {active.price.toLocaleString("vi-VN")}
                </span>
              </div>
              <button
                disabled
                title="Sắp mở"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFD700] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-slate-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart className="size-4" /> Mua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
