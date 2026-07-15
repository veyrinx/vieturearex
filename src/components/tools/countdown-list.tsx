"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FFCountdown } from "@/lib/data/ff-countdowns";

const TAG_CLS: Record<string, string> = {
  Update: "bg-blue-500/12 text-blue-500",
  Rank: "bg-amber-500/12 text-amber-500",
  "Sự kiện": "bg-emerald-500/12 text-emerald-500",
  "Bảo trì": "bg-rose-500/12 text-rose-500",
};

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[2ch] rounded-lg bg-muted/60 px-2 py-1 text-center font-heading text-xl font-black tabular-nums text-foreground">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export function CountdownList({ items }: { items: FFCountdown[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [items],
  );

  return (
    <div className="space-y-3">
      {sorted.map((it) => {
        const target = new Date(it.date).getTime();
        const done = now != null && now >= target;
        const p = parts(now != null ? target - now : 0);
        return (
          <div key={it.label + it.date} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">{it.label}</h2>
              {it.tag && (
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase", TAG_CLS[it.tag] ?? "bg-muted text-muted-foreground")}>
                  {it.tag}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(it.date).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {now == null ? (
              <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
            ) : done ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
                <CheckCircle2 className="size-4" /> Đã diễn ra
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Cell value={p.d} label="Ngày" />
                <Cell value={p.h} label="Giờ" />
                <Cell value={p.m} label="Phút" />
                <Cell value={p.s} label="Giây" />
              </div>
            )}

            {it.note && <p className="mt-3 text-xs text-muted-foreground">{it.note}</p>}
          </div>
        );
      })}
    </div>
  );
}
