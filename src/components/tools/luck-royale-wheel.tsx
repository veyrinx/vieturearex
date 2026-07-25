"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gem, RotateCw, RefreshCw, Trophy, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Dữ liệu vòng quay ──────────────────────────────────────────────────────────

type Rarity = "legendary" | "epic" | "rare" | "common";

type Item = { name: string; rarity: Rarity; grand?: boolean };
type Theme = { key: string; label: string; items: Item[] };

const RARITY: Record<Rarity, { color: string; ring: string; emoji: string; label: string }> = {
  legendary: { color: "#f59e0b", ring: "text-amber-500",   emoji: "🏆", label: "Huyền thoại" },
  epic:      { color: "#a855f7", ring: "text-purple-500",  emoji: "🔥", label: "Sử thi" },
  rare:      { color: "#3b82f6", ring: "text-blue-500",    emoji: "💠", label: "Hiếm" },
  common:    { color: "#64748b", ring: "text-slate-400",   emoji: "⚪", label: "Thường" },
};

// Chi phí tăng dần theo số vật phẩm đã trúng (mô phỏng Faded Wheel).
const COSTS = [9, 19, 39, 69, 109, 199, 299, 399, 519];

const THEMES: Theme[] = [
  {
    key: "sung",
    label: "Súng Huyền Thoại",
    items: [
      { name: "MP40 — Rồng Vàng", rarity: "legendary", grand: true },
      { name: "Áo choàng Rồng", rarity: "epic" },
      { name: "Thú cưỡi Rồng con", rarity: "epic" },
      { name: "Gói 500 kim cương", rarity: "rare" },
      { name: "Thẻ EXP x2 (7 ngày)", rarity: "rare" },
      { name: "Khung avatar Rồng", rarity: "rare" },
      { name: "Gói 100 kim cương", rarity: "common" },
      { name: "Biểu cảm hiếm", rarity: "common" },
      { name: "Bo mạch nâng cấp", rarity: "common" },
    ],
  },
  {
    key: "trang-phuc",
    label: "Trang Phục Đỉnh",
    items: [
      { name: "Bộ Joker Đỏ", rarity: "legendary", grand: true },
      { name: "Bộ Angelic", rarity: "epic" },
      { name: "Mặt nạ Cobra", rarity: "epic" },
      { name: "Gói 500 kim cương", rarity: "rare" },
      { name: "Skin balo hiếm", rarity: "rare" },
      { name: "Dù bay đặc biệt", rarity: "rare" },
      { name: "Gói 100 kim cương", rarity: "common" },
      { name: "Thẻ đổi tên", rarity: "common" },
      { name: "Hộp quà ngẫu nhiên", rarity: "common" },
    ],
  },
];

const SPIN_MS = 3600;
const fmt = (n: number) => n.toLocaleString("vi-VN");

// ── Component ───────────────────────────────────────────────────────────────────

export function LuckRoyaleWheel() {
  const [themeKey, setThemeKey] = useState(THEMES[0].key);
  const theme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];
  const items = theme.items;
  const N = items.length;
  const seg = 360 / N;
  const grandIdx = items.findIndex((i) => i.grand);

  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [spins, setSpins] = useState(0);
  const [won, setWon] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const autoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinRef = useRef<() => void>(() => {});

  const reset = useCallback(() => {
    autoRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setCollected(new Set());
    setRotation(0);
    setSpinning(false);
    setTotalDiamonds(0);
    setSpins(0);
    setWon(false);
    setLastWin(null);
  }, []);

  // Đổi theme → reset toàn bộ.
  useEffect(() => { reset(); }, [themeKey, reset]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const cost = COSTS[Math.min(collected.size, COSTS.length - 1)];

  const spin = useCallback(() => {
    setSpinning((busy) => {
      if (busy) return busy;
      // Chọn ngẫu nhiên trong số chưa trúng.
      const remaining = items.map((_, i) => i).filter((i) => !collected.has(i));
      if (remaining.length === 0) return busy;
      const target = remaining[Math.floor(Math.random() * remaining.length)];

      const aCenter = target * seg + seg / 2;               // góc tâm ô (từ đỉnh, thuận chiều)
      const jitter = (Math.random() - 0.5) * seg * 0.6;     // lệch nhẹ khỏi tâm
      setRotation((prev) => {
        const targetMod = (360 - aCenter - jitter) % 360;
        const cur = ((prev % 360) + 360) % 360;
        const delta = (targetMod - cur + 360) % 360;
        return prev + delta + 360 * 5;                       // 5 vòng cho đã mắt
      });

      timerRef.current = setTimeout(() => {
        setCollected((prev) => new Set(prev).add(target));
        setTotalDiamonds((d) => d + cost);
        setSpins((s) => s + 1);
        setLastWin(target);
        setSpinning(false);
        if (target === grandIdx) {
          setWon(true);
          autoRef.current = false;
        } else if (autoRef.current) {
          timerRef.current = setTimeout(() => spinRef.current(), 500);
        }
      }, SPIN_MS);
      return true;
    });
  }, [items, collected, seg, cost, grandIdx]);

  useEffect(() => { spinRef.current = spin; }, [spin]);

  const spinUntilGrand = useCallback(() => {
    if (won || spinning) return;
    autoRef.current = true;
    spin();
  }, [won, spinning, spin]);

  // conic-gradient tô màu từng ô; ô đã trúng → xám mờ.
  const gradient = `conic-gradient(from 0deg, ${items
    .map((it, i) => {
      const c = collected.has(i) ? "#cbd5e1" : RARITY[it.rarity].color;
      return `${c} ${i * seg}deg ${(i + 1) * seg}deg`;
    })
    .join(", ")})`;

  const allDone = collected.size === N;

  return (
    <div className="space-y-5">
      {/* Chọn vòng quay */}
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setThemeKey(t.key)}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-xs font-bold transition",
              t.key === themeKey
                ? "border-primary bg-primary text-primary-foreground dark:border-amber-400 dark:bg-amber-400 dark:text-slate-900"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Vòng quay */}
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        {/* Kim chỉ */}
        <div className="absolute -top-1 z-20 size-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-primary drop-shadow-md dark:border-t-amber-400" />

        <div className="relative aspect-square w-full">
          {/* Bánh xe */}
          <div
            className="absolute inset-0 rounded-full border-8 border-card shadow-xl"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.16,1,0.3,1)` : "none",
            }}
          >
            {/* Nhãn từng ô */}
            {items.map((it, i) => {
              const a = (i * seg + seg / 2) * (Math.PI / 180);
              const r = 38;
              const x = 50 + r * Math.sin(a);
              const y = 50 - r * Math.cos(a);
              const done = collected.has(i);
              return (
                <div
                  key={i}
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 text-center transition-opacity", done && "opacity-25")}
                  style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${i * seg + seg / 2}deg)` }}
                >
                  <span className="text-2xl leading-none drop-shadow">{it.grand ? "🏆" : RARITY[it.rarity].emoji}</span>
                </div>
              );
            })}
          </div>

          {/* Nút quay ở tâm */}
          <button
            type="button"
            onClick={() => { autoRef.current = false; spin(); }}
            disabled={spinning || won || allDone}
            className={cn(
              "absolute left-1/2 top-1/2 z-10 flex size-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-card bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:from-amber-400 dark:to-amber-500 dark:text-slate-900",
            )}
          >
            {spinning ? (
              <RotateCw className="size-5 animate-spin" />
            ) : (
              <>
                <span className="flex items-center gap-0.5 text-sm font-black tabular-nums leading-none">
                  {cost}<Gem className="size-3" />
                </span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider opacity-80">Quay</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nút điều khiển */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={spinUntilGrand}
          disabled={spinning || won || allDone}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-slate-900"
        >
          <Zap className="size-4" /> Quay tới khi trúng ĐT
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground active:scale-[0.98]"
        >
          <RefreshCw className="size-4" /> Chơi lại
        </button>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Kim cương đã đốt" value={fmt(totalDiamonds)} icon={<Gem className="size-3.5" />} accent="text-primary dark:text-amber-400" />
        <Stat label="Số lượt quay" value={fmt(spins)} icon={<RotateCw className="size-3.5" />} accent="text-blue-500" />
        <Stat label="Đã nhận" value={`${collected.size}/${N}`} icon={<Sparkles className="size-3.5" />} accent="text-emerald-500" />
      </div>

      {/* Kết quả trúng đại thưởng */}
      {won && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/[0.04] p-5 text-center duration-500">
          <Trophy className="mx-auto size-8 text-amber-500" />
          <p className="mt-2 font-heading text-lg font-black uppercase text-amber-600 dark:text-amber-400">Trúng đại thưởng!</p>
          <p className="mt-1 text-sm text-foreground">
            <b>{items[grandIdx].name}</b>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn tốn <b className="text-foreground">{fmt(totalDiamonds)}</b> <Gem className="inline size-3.5 text-amber-500" /> qua <b className="text-foreground">{spins}</b> lượt.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">≈ {fmt(Math.round(totalDiamonds * 250))} ₫ nếu nạp (tỉ giá ~250đ/KC)</p>
        </div>
      )}

      {/* Danh sách vật phẩm */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Vật phẩm trong vòng quay</p>
        <div className="space-y-1.5">
          {items.map((it, i) => {
            const done = collected.has(i);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition",
                  it.grand ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-border/60",
                  done && "opacity-50",
                  lastWin === i && !won && "ring-2 ring-primary/40 dark:ring-amber-400/40",
                )}
              >
                <span className="text-lg leading-none">{it.grand ? "🏆" : RARITY[it.rarity].emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-semibold", it.grand ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                    {it.name}
                  </p>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", RARITY[it.rarity].ring)}>
                    {it.grand ? "★ Đại thưởng" : RARITY[it.rarity].label}
                  </p>
                </div>
                {done && <span className="text-[10px] font-bold text-emerald-500">✓ Đã nhận</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghi chú */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary dark:text-amber-400" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Đây là <b className="text-foreground">giả lập cho vui</b> để thấy vòng quay tốn bao nhiêu kim cương — không phải vòng quay thật, không liên kết Garena.
          Tỉ lệ & vật phẩm chỉ mô phỏng. Vòng quay thật là may rủi, <b className="text-foreground">cân nhắc kỹ trước khi nạp</b>.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-3 text-center">
      <span className={cn("flex items-center gap-1", accent)}>{icon}</span>
      <span className="font-heading text-lg font-black tabular-nums leading-none text-foreground">{value}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
