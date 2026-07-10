"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Crosshair, Zap, Target, Crown, Smartphone, Hand, Sparkles,
  Copy, Save, RotateCcw, Check, Gauge, Cpu, ScanLine,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Cấu hình lựa chọn ──────────────────────────────────────────────
type PlayStyle = "rusher" | "balanced" | "sniper" | "beginner";
type Fingers = 2 | 3 | 4 | 5;
type DeviceTier = "entry" | "mid" | "flagship";

const PLAYSTYLES: { key: PlayStyle; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "rusher",   label: "Rush",       desc: "Cận chiến, xoay nhanh",   icon: Zap },
  { key: "balanced", label: "Cân Bằng",   desc: "Linh hoạt mọi tình huống", icon: Crosshair },
  { key: "sniper",   label: "Bắn Tỉa",    desc: "Kiểm soát, ngắm xa",       icon: Target },
  { key: "beginner", label: "Người Mới",  desc: "Dễ làm quen, ổn định",     icon: Sparkles },
];

const FINGERS: Fingers[] = [2, 3, 4, 5];

const DEVICES: { key: DeviceTier; label: string; desc: string }[] = [
  { key: "entry",    label: "Máy Yếu",    desc: "Phổ thông, giật lag" },
  { key: "mid",      label: "Tầm Trung",  desc: "Mượt ổn định" },
  { key: "flagship", label: "Cao Cấp",    desc: "90/120Hz, mượt tối đa" },
];

// ── Thông số nền theo phong cách ───────────────────────────────────
// [general, redDot, x2, x4, sniper, freeLook]
const BASE: Record<PlayStyle, { s: number[]; dpi: number }> = {
  rusher:   { s: [200, 190, 175, 150, 120, 200], dpi: 480 },
  balanced: { s: [175, 165, 150, 125, 105, 180], dpi: 430 },
  sniper:   { s: [150, 140, 130, 112, 95, 160],  dpi: 400 },
  beginner: { s: [135, 125, 112, 98, 82, 145],   dpi: 360 },
};

const FINGER_MOD: Record<Fingers, number> = { 2: 0.85, 3: 0.95, 4: 1.05, 5: 1.12 };
const DEVICE_MOD: Record<DeviceTier, number> = { entry: 0.9, mid: 1.0, flagship: 1.08 };
const DEVICE_DPI: Record<DeviceTier, number> = { entry: 0.82, mid: 1.0, flagship: 1.12 };

const FIELDS = [
  { key: "general",  label: "Chung",        short: "Tổng thể" },
  { key: "redDot",   label: "Điểm Đỏ",      short: "Red Dot" },
  { key: "x2",       label: "Ống Ngắm 2x",  short: "2x Scope" },
  { key: "x4",       label: "Ống Ngắm 4x",  short: "4x Scope" },
  { key: "sniper",   label: "Bắn Tỉa",      short: "Sniper" },
  { key: "freeLook", label: "Nhìn Tự Do",   short: "Free Look" },
] as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Result = { values: number[]; dpi: number };

function compute(style: PlayStyle, fingers: Fingers, device: DeviceTier, intensity: number): Result {
  const base = BASE[style];
  const mod = FINGER_MOD[fingers] * DEVICE_MOD[device] * (1 + intensity / 100);
  const values = base.s.map((v) => clamp(Math.round(v * mod), 0, 200));
  const dpi = clamp(Math.round(base.dpi * DEVICE_DPI[device] * (1 + intensity / 200)), 200, 800);
  return { values, dpi };
}

const PRESETS: { name: string; style: PlayStyle; fingers: Fingers; device: DeviceTier }[] = [
  { name: "Rush 4 ngón",     style: "rusher",   fingers: 4, device: "flagship" },
  { name: "Cân bằng 3 ngón", style: "balanced", fingers: 3, device: "mid" },
  { name: "Bắn tỉa ổn định", style: "sniper",   fingers: 4, device: "mid" },
  { name: "Người mới 2 ngón", style: "beginner", fingers: 2, device: "entry" },
];

const STORAGE_KEY = "arex_sens_preset";

// ── Nhận diện thiết bị ─────────────────────────────────────────────
type DetectedInfo = {
  tier: DeviceTier;
  refreshHz: number | null;
  cores: number | null;
  memory: number | null;
  dpr: number;
  shortSide: number; // cạnh ngắn (pixel vật lý) ~ độ phân giải ngang
  brand: string;
};

// Đo tần số quét màn hình bằng cách đếm frame trong ~500ms
function measureRefresh(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") return resolve(null);
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      const elapsed = now - start;
      if (elapsed >= 500) resolve(Math.round((frames / elapsed) * 1000));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function guessBrand(ua: string): string {
  const s = ua || "";
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/SM-|Samsung/i.test(s)) return "Samsung";
  if (/Redmi|POCO|Xiaomi|\bMI\b/i.test(s)) return "Xiaomi";
  if (/OPPO|CPH/i.test(s)) return "OPPO";
  if (/vivo/i.test(s)) return "vivo";
  if (/Realme|RMX/i.test(s)) return "Realme";
  if (/OnePlus/i.test(s)) return "OnePlus";
  if (/HUAWEI|Honor/i.test(s)) return "Huawei/Honor";
  if (/Android/i.test(s)) return "Android";
  if (/Windows|Macintosh|Mac OS|Linux/i.test(s)) return "Máy tính";
  return "Thiết bị";
}

function classifyTier(o: {
  cores: number | null; memory: number | null; refreshHz: number | null; dpr: number; shortSide: number;
}): DeviceTier {
  let score = 0;
  if (o.cores != null) score += o.cores >= 8 ? 2 : o.cores >= 6 ? 1 : 0;
  if (o.memory != null) score += o.memory >= 6 ? 2 : o.memory >= 4 ? 1 : 0;
  if (o.refreshHz != null) score += o.refreshHz >= 100 ? 2 : o.refreshHz >= 85 ? 1 : 0;
  if (o.dpr >= 3) score += 1;
  if (o.shortSide >= 1080) score += 1;
  if (score >= 5) return "flagship";
  if (score <= 1) return "entry";
  return "mid";
}

async function detectDevice(): Promise<DetectedInfo> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;
  const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const dpr = window.devicePixelRatio || 1;
  const sw = (window.screen?.width ?? 0) * dpr;
  const sh = (window.screen?.height ?? 0) * dpr;
  const shortSide = Math.round(Math.min(sw, sh));
  const brand = guessBrand(nav.userAgent);
  const refreshHz = await measureRefresh();
  const tier = classifyTier({ cores, memory, refreshHz, dpr, shortSide });
  return { tier, refreshHz, cores, memory, dpr, shortSide, brand };
}

// ── Component ──────────────────────────────────────────────────────
export function SensitivityTool() {
  const [style, setStyle] = useState<PlayStyle>("balanced");
  const [fingers, setFingers] = useState<Fingers>(3);
  const [device, setDevice] = useState<DeviceTier>("mid");
  const [intensity, setIntensity] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);

  // Nạp preset đã lưu + tự nhận diện máy
  useEffect(() => {
    let hadSaved = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { style: PlayStyle; fingers: Fingers; device: DeviceTier; intensity: number };
        if (p.style) setStyle(p.style);
        if (p.fingers) setFingers(p.fingers);
        if (p.device) setDevice(p.device);
        if (typeof p.intensity === "number") setIntensity(p.intensity);
        setHasSaved(true);
        hadSaved = true;
      }
    } catch { /**/ }

    let cancelled = false;
    detectDevice().then((info) => {
      if (cancelled) return;
      setDetected(info);
      // Chỉ tự chọn cấu hình máy khi người dùng chưa có preset lưu sẵn
      if (!hadSaved) setDevice(info.tier);
    }).catch(() => { /**/ });
    return () => { cancelled = true; };
  }, []);

  const result = useMemo(() => compute(style, fingers, device, intensity), [style, fingers, device, intensity]);

  const handleCopy = async () => {
    const lines = FIELDS.map((f, i) => `${f.label}: ${result.values[i]}`).join("\n");
    const text = `⚙️ Độ nhạy Free Fire (Arex)\n${lines}\nDPI đề xuất: ${result.dpi}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Đã copy thông số độ nhạy!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Không copy được. Thử lại.");
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ style, fingers, device, intensity }));
      setHasSaved(true);
      toast.success("Đã lưu cấu hình của bạn!");
    } catch {
      toast.error("Không lưu được.");
    }
  };

  const handleRedetect = () => {
    setDetected(null);
    detectDevice().then((info) => {
      setDetected(info);
      setDevice(info.tier);
      toast.success("Đã nhận diện lại máy!");
    }).catch(() => {
      toast.error("Không nhận diện được. Thử lại.");
    });
  };

  const handleReset = () => {
    setStyle("balanced");
    setFingers(3);
    setDevice("mid");
    setIntensity(0);
    toast.message("Đã đặt lại về mặc định.");
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setStyle(p.style);
    setFingers(p.fingers);
    setDevice(p.device);
    setIntensity(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* ── Cột chọn ── */}
      <div className="space-y-6">
        {/* Phong cách chơi */}
        <Section title="Phong cách chơi" icon={Crown}>
          <div className="grid grid-cols-2 gap-2">
            {PLAYSTYLES.map(({ key, label, desc, icon: Icon }) => (
              <ChoiceCard
                key={key}
                active={style === key}
                onClick={() => setStyle(key)}
                icon={Icon}
                label={label}
                desc={desc}
              />
            ))}
          </div>
        </Section>

        {/* Số ngón */}
        <Section title="Số ngón điều khiển" icon={Hand}>
          <div className="grid grid-cols-4 gap-2">
            {FINGERS.map((f) => (
              <button
                key={f}
                onClick={() => setFingers(f)}
                className={cn(
                  "rounded-xl border py-3 text-center transition-all",
                  fingers === f
                    ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/20 hover:bg-primary/5",
                )}
              >
                <span className="block text-lg font-black leading-none">{f}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">ngón</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Thiết bị */}
        <Section title="Cấu hình máy" icon={Smartphone}>
          <div className="grid grid-cols-3 gap-2">
            {DEVICES.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center transition-all",
                  device === key
                    ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/20 hover:bg-primary/5",
                )}
              >
                <span className="block text-xs font-bold">{label}</span>
                <span className="mt-0.5 block text-[9px] leading-tight opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          {/* Kết quả tự nhận diện máy */}
          {detected ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold text-foreground">
                <Cpu className="size-3.5 text-primary dark:text-amber-400" /> {detected.brand}
              </span>
              {detected.refreshHz != null && <SpecChip>{detected.refreshHz}Hz</SpecChip>}
              {detected.cores != null && <SpecChip>{detected.cores} nhân</SpecChip>}
              {detected.memory != null && <SpecChip>{detected.memory}GB RAM</SpecChip>}
              {detected.shortSide > 0 && <SpecChip>{detected.shortSide}px</SpecChip>}
              <span className="ml-auto whitespace-nowrap text-[10px]">
                → đề xuất{" "}
                <span className="font-bold text-primary dark:text-amber-400">
                  {DEVICES.find((d) => d.key === detected.tier)?.label}
                </span>
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <ScanLine className="size-3.5 animate-pulse text-primary dark:text-amber-400" />
              Đang nhận diện cấu hình máy của bạn...
            </div>
          )}

          <button
            onClick={handleRedetect}
            disabled={!detected}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary disabled:opacity-50 dark:hover:text-amber-300"
          >
            <ScanLine className="size-3.5" />
            Nhận diện lại máy
          </button>
        </Section>

        {/* Tinh chỉnh */}
        <Section title="Tinh chỉnh tổng thể" icon={Gauge}>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Chậm / Mượt</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 font-bold",
                intensity === 0 ? "bg-muted text-muted-foreground"
                  : intensity > 0 ? "bg-primary/15 text-primary dark:bg-amber-400/15 dark:text-amber-300"
                  : "bg-sky-500/15 text-sky-600 dark:text-sky-400",
              )}>
                {intensity > 0 ? `+${intensity}` : intensity}%
              </span>
              <span className="text-muted-foreground">Nhanh / Nhạy</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary dark:accent-amber-400"
            />
          </div>
        </Section>

        {/* Mẫu tham khảo */}
        <Section title="Mẫu tham khảo" icon={Sparkles}>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/8 hover:text-primary dark:hover:text-amber-300"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Cột kết quả ── */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {/* Header kết quả */}
          <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 px-5 py-4 dark:from-amber-400/10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent dark:via-amber-400/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary dark:text-amber-400">
              Thông số đề xuất
            </p>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
              Độ nhạy của bạn
            </h2>
          </div>

          {/* Bảng giá trị */}
          <div className="space-y-3 p-5">
            {FIELDS.map((f, i) => (
              <ValueBar key={f.key} label={f.label} short={f.short} value={result.values[i]} />
            ))}

            {/* DPI */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-foreground">DPI đề xuất</p>
                <p className="text-[11px] text-muted-foreground">Cài trong phần cài đặt máy</p>
              </div>
              <span className="font-heading text-2xl font-black text-primary dark:text-amber-400">{result.dpi}</span>
            </div>
          </div>

          {/* Hành động */}
          <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
            <button
              onClick={handleCopy}
              className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-90 dark:bg-amber-500"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Đã copy" : "Copy"}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground transition hover:border-primary/30 hover:bg-primary/8"
            >
              <Save className="size-4" />
              Lưu
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition hover:border-border hover:bg-muted"
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
          </div>
        </div>

        {hasSaved && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            💾 Cấu hình được lưu trên máy bạn — tự động nạp lần sau.
          </p>
        )}

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          * Đây là thông số <span className="font-semibold">gợi ý</span> làm điểm khởi đầu. Hãy vào phòng tập bắn
          và tinh chỉnh dần cho hợp tay bạn.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 dark:bg-amber-400/10">
          <Icon className="size-3.5 text-primary dark:text-amber-400" />
        </span>
        <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/70">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SpecChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/80">
      {children}
    </span>
  );
}

function ChoiceCard({
  active, onClick, icon: Icon, label, desc,
}: { active: boolean; onClick: () => void; icon: React.ElementType; label: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/10 dark:border-amber-400/40 dark:bg-amber-400/10"
          : "border-border bg-muted/40 hover:border-primary/20 hover:bg-primary/5",
      )}
    >
      <span className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        active ? "bg-primary/15 dark:bg-amber-400/15" : "bg-background/70",
      )}>
        <Icon className={cn("size-4", active ? "text-primary dark:text-amber-400" : "text-muted-foreground")} />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-bold leading-tight", active ? "text-primary dark:text-amber-300" : "text-foreground")}>
          {label}
        </span>
        <span className="block text-[10px] leading-tight text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

function ValueBar({ label, short, value }: { label: string; short: string; value: number }) {
  const pct = (value / 200) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          {label} <span className="text-[10px] font-normal text-muted-foreground">· {short}</span>
        </span>
        <span className="font-heading text-base font-black text-primary dark:text-amber-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 dark:from-amber-400 dark:to-orange-400"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>
    </div>
  );
}
