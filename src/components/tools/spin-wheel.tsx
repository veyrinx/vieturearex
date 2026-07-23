"use client";

import { useMemo, useRef, useState } from "react";
import { Gem, Sparkles, RotateCw, Zap, Trophy, Wallet } from "lucide-react";

// ─── Mô phỏng các loại vòng quay Free Fire ───────────────────────────────────
// Nhiều loại như trong game: Kim Cương / Vũ Khí Hoàng Gia (quay thường, tỉ lệ cố
// định) và Vòng Quay Nhạt Nhòa (Faded: trúng ô nào mất ô đó, giá tăng dần, chắc
// chắn ra Bundle sau tối đa N lượt). Mục đích: minh bạch chi phí, chơi có trách
// nhiệm — tỉ lệ ở đây là ví dụ minh hoạ, không phải số liệu chính thức.

type Segment = { label: string; short: string; color: string; weight: number; grand?: boolean };
type Wheel = {
  key: string;
  name: string;
  tag: string;
  desc: string;
  cost: number; // kim cương / lượt (vòng quay thường)
  segments: Segment[];
  faded?: boolean;
  fadedCosts?: number[]; // giá tăng dần theo từng lượt (faded)
};

const WHEELS: Wheel[] = [
  {
    key: "diamond",
    name: "Kim Cương Hoàng Gia",
    tag: "Diamond Royale",
    desc: "Quay thường bằng kim cương — bundle & trang phục cao cấp.",
    cost: 60,
    segments: [
      { label: "Bundle Huyền Thoại", short: "BUNDLE", color: "#f59e0b", weight: 1, grand: true },
      { label: "Skin Nhân Vật", short: "SKIN NV", color: "#ec4899", weight: 3 },
      { label: "Trang Phục", short: "TRANG PHỤC", color: "#a855f7", weight: 6 },
      { label: "Thẻ Đổi Tên", short: "ĐỔI TÊN", color: "#3b82f6", weight: 10 },
      { label: "Hộp Quà", short: "HỘP", color: "#10b981", weight: 20 },
      { label: "Kim Cương", short: "KC", color: "#06b6d4", weight: 25 },
      { label: "Chúc May Mắn", short: "TRƯỢT", color: "#64748b", weight: 35 },
    ],
  },
  {
    key: "weapon",
    name: "Vũ Khí Hoàng Gia",
    tag: "Weapon Royale",
    desc: "Skin súng vĩnh viễn — huyền thoại rất hiếm.",
    cost: 40,
    segments: [
      { label: "Skin Súng Huyền Thoại", short: "LEGEND", color: "#f59e0b", weight: 1, grand: true },
      { label: "Skin Súng Sử Thi", short: "EPIC", color: "#ef4444", weight: 4 },
      { label: "Bùa Súng", short: "BÙA", color: "#a855f7", weight: 8 },
      { label: "Skin Súng Thường", short: "SKIN", color: "#3b82f6", weight: 14 },
      { label: "Hộp Súng", short: "HỘP", color: "#10b981", weight: 22 },
      { label: "Chúc May Mắn", short: "TRƯỢT", color: "#64748b", weight: 51 },
    ],
  },
  {
    key: "faded",
    name: "Vòng Quay Nhạt Nhòa",
    tag: "Faded Wheel",
    desc: "Trúng ô nào mất ô đó, giá tăng dần — chắc chắn ra Bundle trong tối đa 8 lượt.",
    cost: 0,
    faded: true,
    fadedCosts: [9, 39, 69, 99, 149, 199, 299, 499],
    segments: [
      { label: "Bundle Huyền Thoại", short: "BUNDLE", color: "#f59e0b", weight: 1, grand: true },
      { label: "Skin Súng", short: "SKIN", color: "#ef4444", weight: 2 },
      { label: "Thú Cưỡi", short: "PET", color: "#a855f7", weight: 2 },
      { label: "Thẻ Đổi Tên", short: "ĐỔI TÊN", color: "#3b82f6", weight: 2 },
      { label: "Hộp Quà", short: "HỘP", color: "#10b981", weight: 3 },
      { label: "500 Kim Cương", short: "500 KC", color: "#06b6d4", weight: 2 },
      { label: "Áo Thời Trang", short: "ÁO", color: "#ec4899", weight: 2 },
      { label: "Emote", short: "EMOTE", color: "#14b8a6", weight: 2 },
    ],
  },
];

function num(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + " ₫";

/** Chọn 1 ô theo trọng số, chỉ trong các index cho phép. */
function pickWeighted(segs: Segment[], allowed: number[]): number {
  const total = allowed.reduce((s, i) => s + segs[i].weight, 0);
  let roll = Math.random() * total;
  for (const i of allowed) {
    roll -= segs[i].weight;
    if (roll < 0) return i;
  }
  return allowed[allowed.length - 1];
}

/** Toạ độ điểm trên đường tròn theo góc (độ, tính từ đỉnh, chiều kim đồng hồ). */
function pt(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function SpinWheel() {
  const [wheelKey, setWheelKey] = useState(WHEELS[0].key);
  const wheel = useMemo(() => WHEELS.find((w) => w.key === wheelKey) ?? WHEELS[0], [wheelKey]);
  const segments = wheel.segments;
  const N = segments.length;
  const SEG = 360 / N;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [spins, setSpins] = useState(0);
  const [grandHits, setGrandHits] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [removed, setRemoved] = useState<number[]>([]); // faded: các ô đã trúng
  const [spinCost, setSpinCost] = useState(String(WHEELS[0].cost));
  const [rate, setRate] = useState("");
  const [sim, setSim] = useState<{ spins: number; diamonds: number } | null>(null);
  const rotationRef = useRef(0);

  const perHundred = num(rate);
  const vnd = perHundred > 0 ? Math.round((diamonds / 100) * perHundred) : null;

  const switchWheel = (key: string) => {
    if (spinning) return;
    const w = WHEELS.find((x) => x.key === key) ?? WHEELS[0];
    setWheelKey(key);
    setSpinCost(String(w.cost));
    setRotation(0);
    rotationRef.current = 0;
    setResult(null);
    setSpins(0);
    setGrandHits(0);
    setDiamonds(0);
    setRemoved([]);
    setSim(null);
  };

  const spin = () => {
    if (spinning) return;

    // Với Faded: chỉ quay trong các ô còn lại; hết ô thì bắt đầu vòng mới.
    let allowed: number[];
    let curRemoved = removed;
    if (wheel.faded) {
      if (removed.length >= N) {
        curRemoved = [];
        setRemoved([]);
      }
      allowed = segments.map((_, i) => i).filter((i) => !curRemoved.includes(i));
    } else {
      allowed = segments.map((_, i) => i);
    }

    // Chi phí lượt này.
    const cost = wheel.faded ? (wheel.fadedCosts?.[curRemoved.length] ?? 0) : num(spinCost);

    const target = pickWeighted(segments, allowed);
    const center = target * SEG + SEG / 2;
    const jitter = (Math.random() - 0.5) * SEG * 0.5;
    const landing = (360 - ((center + jitter) % 360)) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    let delta = landing - currentMod;
    if (delta < 0) delta += 360;
    const next = rotationRef.current + 5 * 360 + delta;
    rotationRef.current = next;

    setRotation(next);
    setSpinning(true);
    setResult(null);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(segments[target]);
      setSpins((s) => s + 1);
      setDiamonds((d) => d + cost);
      if (segments[target].grand) setGrandHits((g) => g + 1);
      if (wheel.faded) setRemoved((prev) => (prev.includes(target) ? prev : [...prev, target]));
    }, 4200);
  };

  // Mô phỏng tức thì: quay đến khi trúng Bundle, đếm số lượt & kim cương.
  const simulateUntilGrand = () => {
    const all = segments.map((_, i) => i);
    let count = 0;
    let total = 0;
    const CAP = 100_000;
    if (wheel.faded) {
      const rem: number[] = [];
      while (count < CAP) {
        const allow = all.filter((i) => !rem.includes(i));
        const picked = pickWeighted(segments, allow);
        total += wheel.fadedCosts?.[rem.length] ?? 0;
        rem.push(picked);
        count++;
        if (segments[picked].grand) break;
        if (rem.length >= N) rem.length = 0; // vòng mới nếu chưa ra (hiếm)
      }
    } else {
      const cost = num(spinCost);
      while (count < CAP) {
        count++;
        total += cost;
        if (segments[pickWeighted(segments, all)].grand) break;
      }
    }
    setSim({ spins: count, diamonds: total });
  };

  const reset = () => {
    setSpins(0);
    setGrandHits(0);
    setDiamonds(0);
    setResult(null);
    setRemoved([]);
    setSim(null);
    setRotation(0);
    rotationRef.current = 0;
  };

  const grandRate = useMemo(() => {
    const g = segments.find((s) => s.grand)?.weight ?? 0;
    const total = segments.reduce((s, x) => s + x.weight, 0);
    return (g / total) * 100;
  }, [segments]);

  const nextCost = wheel.faded ? (wheel.fadedCosts?.[Math.min(removed.length, N - 1)] ?? 0) : num(spinCost);

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <div>
          <p className="text-sm font-bold text-foreground">Vòng quay may mắn (mô phỏng)</p>
          <p className="text-[11px] text-muted-foreground">
            Nhiều loại như trong game — chọn một loại và quay thử để thấy chi phí thực.
          </p>
        </div>
      </div>

      {/* Chọn loại vòng quay */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {WHEELS.map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => switchWheel(w.key)}
            disabled={spinning}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] transition disabled:opacity-50 ${
              w.key === wheelKey
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        <b className="text-foreground">{wheel.tag}</b> · {wheel.desc} · Tỉ lệ Bundle ~{grandRate.toFixed(0)}%
      </p>

      {/* Bánh xe */}
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        <div className="absolute left-1/2 top-[-2px] z-20 -translate-x-1/2">
          <div className="size-0 border-x-[11px] border-t-[20px] border-x-transparent border-t-primary drop-shadow" />
        </div>

        <svg
          viewBox="0 0 200 200"
          className="size-full drop-shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.2s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          }}
        >
          <circle cx="100" cy="100" r="99" fill="#0f172a" />
          {segments.map((s, i) => {
            const a0 = i * SEG;
            const a1 = (i + 1) * SEG;
            const [x0, y0] = pt(100, 100, 95, a0);
            const [x1, y1] = pt(100, 100, 95, a1);
            const [lx, ly] = pt(100, 100, 60, a0 + SEG / 2);
            const gone = wheel.faded && removed.includes(i);
            return (
              <g key={i} opacity={gone ? 0.18 : 1}>
                <path
                  d={`M100 100 L${x0.toFixed(2)} ${y0.toFixed(2)} A95 95 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
                  fill={gone ? "#334155" : s.color}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  opacity={s.grand && !gone ? 1 : 0.92}
                />
                <text
                  x={lx.toFixed(2)}
                  y={ly.toFixed(2)}
                  fill="#fff"
                  fontSize="8"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${a0 + SEG / 2}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
                  style={{ letterSpacing: "0.02em" }}
                >
                  {s.short}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="95" fill="none" stroke="#fbbf24" strokeWidth="2.5" opacity="0.85" />
          <circle cx="100" cy="100" r="16" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
        </svg>

        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="absolute left-1/2 top-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-70"
          aria-label="Quay"
        >
          <RotateCw className={`size-5 ${spinning ? "animate-spin" : ""}`} />
          <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider">
            {spinning ? "..." : "Quay"}
          </span>
        </button>
      </div>

      {/* Giá lượt kế tiếp */}
      <p className="text-center text-xs text-muted-foreground">
        Lượt kế tiếp:{" "}
        <b className="text-foreground tabular-nums">{nextCost.toLocaleString("vi-VN")}</b>{" "}
        <Gem className="inline size-3.5 text-cyan-500" />
        {wheel.faded && <span className="ml-1 text-amber-500">(giá tăng dần)</span>}
      </p>

      {/* Kết quả */}
      <div className="min-h-[52px] rounded-xl border border-border bg-muted/30 p-3 text-center">
        {result ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ background: result.color }}
            >
              {result.grand && <Trophy className="size-4" />}
              {result.label}
            </span>
            {result.grand && <span className="text-xs font-bold text-amber-500">🎉 Cực hiếm!</span>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {spinning ? "Đang quay..." : "Bấm nút giữa để quay thử."}
          </p>
        )}
      </div>

      {/* Cấu hình (ẩn ô kim cương/lượt khi là Faded vì giá cố định tăng dần) */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!wheel.faded && (
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Kim cương / 1 lượt
            </label>
            <input
              inputMode="numeric"
              value={spinCost}
              onChange={(e) => setSpinCost(e.target.value)}
              placeholder="vd: 40"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
        <div className={`space-y-1 ${wheel.faded ? "sm:col-span-2" : ""}`}>
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Wallet className="size-3.5" /> VNĐ / 100 kim cương
          </label>
          <input
            inputMode="numeric"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="vd: 25000"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Thống kê cộng dồn */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon={RotateCw} label="Lượt đã quay" value={spins.toLocaleString("vi-VN")} />
        <Stat icon={Gem} label="Kim cương tốn" value={diamonds.toLocaleString("vi-VN")} accent="text-cyan-500" />
        <Stat icon={Trophy} label="Lần trúng Bundle" value={grandHits.toLocaleString("vi-VN")} accent="text-amber-500" />
      </div>
      {vnd != null && spins > 0 && (
        <p className="text-center text-sm">
          Tổng đã &quot;nạp&quot; ước tính: <b className="text-base text-primary">{fmtVnd(vnd)}</b>
        </p>
      )}

      {/* Mô phỏng đến khi trúng */}
      <div className="rounded-xl border border-dashed border-border p-3">
        <button
          type="button"
          onClick={simulateUntilGrand}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/15"
        >
          <Zap className="size-4" /> Mô phỏng: quay đến khi trúng Bundle
        </button>
        {sim && (
          <div className="mt-3 text-center text-sm">
            <p>
              Lần này mất{" "}
              <b className="text-base text-primary tabular-nums">{sim.spins.toLocaleString("vi-VN")}</b> lượt ={" "}
              <b className="tabular-nums">{sim.diamonds.toLocaleString("vi-VN")}</b>{" "}
              <Gem className="inline size-4 text-cyan-500" />
              {perHundred > 0 && (
                <>
                  {" "}≈ <b className="text-foreground">{fmtVnd(Math.round((sim.diamonds / 100) * perHundred))}</b>
                </>
              )}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Mỗi lần mô phỏng ra số khác nhau — đó chính là bản chất may rủi.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground/70">
          Chỉ mô phỏng minh hoạ — <b>chơi có trách nhiệm</b>. Tỉ lệ là ví dụ, không phải số liệu chính thức.
        </p>
        {(spins > 0 || sim || removed.length > 0) && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Đặt lại
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent = "text-foreground",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/40 px-2 py-3 text-center">
      <Icon className={`size-4 ${accent}`} />
      <p className={`text-lg font-black tabular-nums leading-none ${accent}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
