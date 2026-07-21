"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

/** Parse "dd/MM/yyyy" (hoặc "yyyy-MM-dd") → mốc cuối ngày đó. */
function parseUntil(s: string): number | null {
  const t = s.trim();
  let d: Date | null = null;
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 23, 59, 59);
  else {
    const parsed = new Date(t);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
}

const UNITS = [
  { key: "d", label: "Ngày", ms: 86_400_000 },
  { key: "h", label: "Giờ", ms: 3_600_000 },
  { key: "m", label: "Phút", ms: 60_000 },
  { key: "s", label: "Giây", ms: 1_000 },
];

export function LockCountdown({ until }: { until: string }) {
  const target = parseUntil(until);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target) {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
        <Clock3 className="size-4" /> Dự kiến mở lại: <b className="text-foreground">{until}</b>
      </p>
    );
  }

  const diff = now === null ? 0 : Math.max(0, target - now);
  const done = now !== null && diff <= 0;

  let rem = diff;
  const parts = UNITS.map((u) => {
    const v = Math.floor(rem / u.ms);
    rem -= v * u.ms;
    return { ...u, value: v };
  });

  return (
    <div className="space-y-2.5">
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Clock3 className="size-3.5" /> {done ? "Đã tới ngày mở" : `Dự kiến mở lại · ${until}`}
      </p>
      {!done && (
        <div className="flex justify-center gap-2">
          {parts.map((p) => (
            <div
              key={p.key}
              className="flex min-w-[58px] flex-col items-center rounded-2xl border border-primary/25 bg-primary/[0.05] px-2 py-2.5 dark:border-amber-400/25 dark:bg-amber-400/[0.06]"
            >
              <span className="font-heading text-2xl font-black leading-none tabular-nums text-primary dark:text-amber-400">
                {String(p.value).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
