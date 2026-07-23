"use client";

import { useMemo, useState } from "react";
import { Gem, Target, RotateCw, Wallet, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function num(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + " ₫";
const fmtNum = (n: number) => n.toLocaleString("vi-VN");

const RATE_PRESETS = [
  { label: "20K", value: "20000" },
  { label: "25K", value: "25000" },
  { label: "30K", value: "30000" },
];
const SPIN_PRESETS = ["10", "50", "100"];

export function TopupCalculator() {
  // Mục tiêu
  const [cost, setCost] = useState("");
  const [have, setHave] = useState("");
  const [rate, setRate] = useState("");
  // Vòng quay
  const [spinCost, setSpinCost] = useState("");
  const [spins, setSpins] = useState("");
  // Tab công cụ đang xem (kiểu giao diện tab)
  const [tab, setTab] = useState<"item" | "spin">("item");

  const r = useMemo(() => {
    const need = Math.max(0, num(cost) - num(have));
    const perHundred = num(rate);
    const vnd = perHundred > 0 ? Math.round((need / 100) * perHundred) : null;
    const spinTotal = num(spinCost) * num(spins);
    const spinVnd = perHundred > 0 && spinTotal > 0 ? Math.round((spinTotal / 100) * perHundred) : null;
    const ownedPct = num(cost) > 0 ? Math.min(100, Math.round((num(have) / num(cost)) * 100)) : 0;
    return {
      need,
      vnd,
      spinTotal,
      spinVnd,
      ownedPct,
      hasTarget: num(cost) > 0,
      hasSpin: spinTotal > 0,
      enough: num(cost) > 0 && need === 0,
    };
  }, [cost, have, rate, spinCost, spins]);

  return (
    <div className="space-y-5">
      {/* ── Tỉ giá ── */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-4 py-3 dark:from-amber-400/8">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary dark:bg-amber-400/12 dark:text-amber-400">
            <Wallet className="size-[18px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Tỉ giá tham khảo</p>
            <p className="text-[11px] text-muted-foreground">VNĐ cho mỗi 100 kim cương</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="relative">
            <input
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="vd: 25000"
              className="h-12 w-full rounded-xl border border-border bg-background pl-4 pr-14 text-lg font-semibold tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₫</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chọn nhanh:</span>
            {RATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRate(p.value)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums transition ${
                  rate === p.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Nhập theo giá gói nạp bạn hay dùng. Bỏ trống nếu chỉ cần tính kim cương.
          </p>
        </div>
      </section>

      {/* Thanh tab chuyển công cụ */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card p-1.5">
        {([["item", "Mua vật phẩm", Target], ["spin", "Chi phí vòng quay", RotateCw]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition",
              tab === id
                ? "bg-primary text-primary-foreground shadow dark:bg-amber-400 dark:text-slate-900"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "item" && (
      /* ── Mua vật phẩm ── */
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-4 py-3 dark:from-amber-400/8">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary dark:bg-amber-400/12 dark:text-amber-400">
            <Target className="size-[18px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Mua vật phẩm</p>
            <p className="text-[11px] text-muted-foreground">Tính kim cương còn thiếu để sở hữu</p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Giá vật phẩm" hint="kim cương">
              <input
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="vd: 1200"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
            <Field label="Đang có" hint="kim cương">
              <input
                inputMode="numeric"
                value={have}
                onChange={(e) => setHave(e.target.value)}
                placeholder="vd: 300"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
          </div>

          {r.hasTarget && (
            <>
              {/* Thanh tiến trình đã có / cần */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Đã có {r.ownedPct}%</span>
                  <span>{fmtNum(num(cost))} <Gem className="inline size-3" /></span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 dark:from-amber-400 dark:to-amber-400/60"
                    style={{ width: `${r.ownedPct}%` }}
                  />
                </div>
              </div>

              {r.enough ? (
                <ResultPanel tone="success">
                  <Check className="size-5 shrink-0 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Bạn đã đủ kim cương để mua!
                  </p>
                </ResultPanel>
              ) : (
                <ResultPanel>
                  <div className="w-full text-center">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cần nạp thêm</p>
                    <p className="mt-1 flex items-center justify-center gap-2 font-heading text-3xl font-black tabular-nums text-primary dark:text-amber-400">
                      {fmtNum(r.need)} <Gem className="size-6" />
                    </p>
                    {r.vnd != null && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        ≈ <b className="text-foreground">{fmtVnd(r.vnd)}</b>
                      </p>
                    )}
                  </div>
                </ResultPanel>
              )}
            </>
          )}
        </div>
      </section>
      )}

      {tab === "spin" && (
      /* ── Chi phí vòng quay ── */
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-4 py-3 dark:from-amber-400/8">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary dark:bg-amber-400/12 dark:text-amber-400">
            <RotateCw className="size-[18px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Chi phí vòng quay</p>
            <p className="text-[11px] text-muted-foreground">Ước tính tổng kim cương &amp; tiền cho nhiều lượt</p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kim cương / 1 lượt" hint="">
              <input
                inputMode="numeric"
                value={spinCost}
                onChange={(e) => setSpinCost(e.target.value)}
                placeholder="vd: 40"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
            <Field label="Số lượt quay" hint="">
              <input
                inputMode="numeric"
                value={spins}
                onChange={(e) => setSpins(e.target.value)}
                placeholder="vd: 50"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Số lượt nhanh:</span>
            {SPIN_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpins(s)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums transition ${
                  spins === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {r.hasSpin && (
            <ResultPanel>
              <div className="w-full text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tổng chi phí</p>
                <p className="mt-1 flex items-center justify-center gap-2 font-heading text-3xl font-black tabular-nums text-primary dark:text-amber-400">
                  {fmtNum(r.spinTotal)} <Gem className="size-6" />
                </p>
                {r.spinVnd != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    ≈ <b className="text-foreground">{fmtVnd(r.spinVnd)}</b>
                  </p>
                )}
              </div>
            </ResultPanel>
          )}
        </div>
      </section>
      )}

      {/* Ghi chú */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary dark:text-amber-400" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Công cụ chỉ để <b className="text-foreground">tính chi phí &amp; chơi có trách nhiệm</b> — không phải quảng cáo nạp.
          Vòng quay là may rủi, hãy cân nhắc kỹ trước khi chi tiền.
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        {hint ? <span className="flex items-center gap-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground/60">{hint} <Gem className="size-2.5" /></span> : null}
      </label>
      {children}
    </div>
  );
}

function ResultPanel({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "success" }) {
  const cls =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/8"
      : "border-primary/20 bg-gradient-to-br from-primary/8 to-primary/[0.02] dark:border-amber-400/20 dark:from-amber-400/8";
  return (
    <div className={`flex items-center justify-center gap-2.5 rounded-xl border p-4 ${cls} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
      {children}
    </div>
  );
}
