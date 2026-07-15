"use client";

import { useMemo, useState } from "react";
import { Skull, Trophy, Crosshair, Target, Percent } from "lucide-react";

type Field = { key: string; label: string; placeholder: string };

const FIELDS: Field[] = [
  { key: "matches", label: "Số trận đã chơi", placeholder: "vd: 500" },
  { key: "wins", label: "Số trận thắng (Booyah)", placeholder: "vd: 120" },
  { key: "kills", label: "Tổng hạ gục", placeholder: "vd: 1800" },
  { key: "deaths", label: "Tổng số lần chết", placeholder: "vd: 900" },
  { key: "headshots", label: "Headshot (tuỳ chọn)", placeholder: "vd: 700" },
];

function num(v: string): number {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function Stat({ icon: Icon, label, value, sub, color }: { icon: typeof Skull; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <Icon className={`mx-auto size-5 ${color}`} />
      <p className="mt-2 font-heading text-2xl font-black tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

export function KdCalculator() {
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const r = useMemo(() => {
    const matches = num(v.matches ?? "");
    const wins = num(v.wins ?? "");
    const kills = num(v.kills ?? "");
    const deaths = num(v.deaths ?? "");
    const hs = num(v.headshots ?? "");
    return {
      kd: deaths > 0 ? kills / deaths : kills,
      winRate: matches > 0 ? (wins / matches) * 100 : 0,
      kpm: matches > 0 ? kills / matches : 0,
      hsRate: kills > 0 && hs > 0 ? (hs / kills) * 100 : null,
      hasInput: matches > 0 || kills > 0 || deaths > 0 || wins > 0,
    };
  }, [v]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{f.label}</label>
            <input
              inputMode="numeric"
              value={v[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
      </div>

      {r.hasInput ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Skull} label="K/D" value={r.kd.toFixed(2)} sub="hạ gục / lần chết" color="text-rose-500" />
          <Stat icon={Trophy} label="Tỉ lệ thắng" value={`${r.winRate.toFixed(1)}%`} sub="booyah / trận" color="text-amber-500" />
          <Stat icon={Crosshair} label="Hạ gục / trận" value={r.kpm.toFixed(2)} sub="trung bình" color="text-sky-500" />
          {r.hsRate != null ? (
            <Stat icon={Target} label="Headshot" value={`${r.hsRate.toFixed(1)}%`} sub="trên tổng hạ gục" color="text-violet-500" />
          ) : (
            <Stat icon={Percent} label="Headshot" value="—" sub="nhập headshot" color="text-muted-foreground" />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Skull className="mx-auto mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nhập chỉ số của bạn để tính K/D, tỉ lệ thắng và hạ gục trung bình.</p>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Xem chỉ số trong game: <b>Hồ sơ → Thống kê</b>. Tính toán chỉ mang tính tham khảo.
      </p>
    </div>
  );
}
