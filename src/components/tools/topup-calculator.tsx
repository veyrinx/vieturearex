"use client";

import { useMemo, useState } from "react";
import { Gem, Target, RotateCw, Wallet } from "lucide-react";

function num(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + " ₫";

export function TopupCalculator() {
  // Mục tiêu
  const [cost, setCost] = useState("");     // giá vật phẩm (kim cương)
  const [have, setHave] = useState("");     // kim cương đang có
  const [rate, setRate] = useState("");     // VNĐ cho 100 kim cương (tỉ giá tham khảo)
  // Vòng quay
  const [spinCost, setSpinCost] = useState(""); // kim cương / 1 lượt
  const [spins, setSpins] = useState("");       // số lượt

  const r = useMemo(() => {
    const need = Math.max(0, num(cost) - num(have));
    const perHundred = num(rate);
    const vnd = perHundred > 0 ? Math.round((need / 100) * perHundred) : null;
    const spinTotal = num(spinCost) * num(spins);
    const spinVnd = perHundred > 0 && spinTotal > 0 ? Math.round((spinTotal / 100) * perHundred) : null;
    return { need, vnd, spinTotal, spinVnd, hasTarget: num(cost) > 0, hasSpin: spinTotal > 0 };
  }, [cost, have, rate, spinCost, spins]);

  return (
    <div className="space-y-6">
      {/* Tỉ giá */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-3.5" /> Tỉ giá tham khảo — VNĐ cho 100 kim cương
        </label>
        <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="vd: 25000"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <p className="text-[11px] text-muted-foreground/70">Nhập theo giá gói nạp bạn hay dùng để ước tính tiền. Bỏ trống nếu chỉ cần tính kim cương.</p>
      </div>

      {/* Mục tiêu vật phẩm */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Target className="size-4 text-primary" /> Mua vật phẩm</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Giá vật phẩm (kim cương)</label>
            <input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="vd: 1200"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kim cương đang có</label>
            <input inputMode="numeric" value={have} onChange={(e) => setHave(e.target.value)} placeholder="vd: 300"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        {r.hasTarget && (
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-sm">Cần nạp thêm <b className="text-lg text-primary tabular-nums">{r.need.toLocaleString()}</b> <Gem className="inline size-4 text-primary" /></p>
            {r.vnd != null && <p className="mt-0.5 text-xs text-muted-foreground">≈ <b className="text-foreground">{fmtVnd(r.vnd)}</b> (theo tỉ giá đã nhập)</p>}
          </div>
        )}
      </div>

      {/* Vòng quay */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground"><RotateCw className="size-4 text-primary" /> Chi phí vòng quay</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kim cương / 1 lượt</label>
            <input inputMode="numeric" value={spinCost} onChange={(e) => setSpinCost(e.target.value)} placeholder="vd: 40"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Số lượt quay</label>
            <input inputMode="numeric" value={spins} onChange={(e) => setSpins(e.target.value)} placeholder="vd: 50"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        {r.hasSpin && (
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-sm">Tổng: <b className="text-lg text-primary tabular-nums">{r.spinTotal.toLocaleString()}</b> <Gem className="inline size-4 text-primary" /></p>
            {r.spinVnd != null && <p className="mt-0.5 text-xs text-muted-foreground">≈ <b className="text-foreground">{fmtVnd(r.spinVnd)}</b></p>}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Chỉ để tính chi phí & <b>chơi có trách nhiệm</b> — không phải quảng cáo nạp. Vòng quay là may rủi, cân nhắc trước khi chi.
      </p>
    </div>
  );
}
