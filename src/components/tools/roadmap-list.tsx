"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound, Sparkles, Gamepad2, CalendarDays, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@/lib/data/ff-roadmap";

const TYPE_META: Record<string, { icon: typeof UserRound; cls: string }> = {
  "Nhân vật": { icon: UserRound, cls: "bg-blue-500/12 text-blue-500" },
  "Skin": { icon: Sparkles, cls: "bg-amber-500/12 text-amber-500" },
  "Chế độ": { icon: Gamepad2, cls: "bg-violet-500/12 text-violet-500" },
  "Sự kiện": { icon: CalendarDays, cls: "bg-emerald-500/12 text-emerald-500" },
  "Bản cập nhật": { icon: RefreshCw, cls: "bg-rose-500/12 text-rose-500" },
};

export function RoadmapList({ items }: { items: RoadmapItem[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [items],
  );

  return (
    <div className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
      {sorted.map((it) => {
        const meta = TYPE_META[it.type] ?? { icon: CalendarDays, cls: "bg-muted text-muted-foreground" };
        const Icon = meta.icon;
        const target = new Date(it.date).getTime();
        const days = now == null ? null : Math.ceil((target - now) / 86_400_000);
        const past = days != null && days < 0;
        return (
          <div key={it.title + it.date} className="relative flex gap-3 pl-0">
            <span className={cn("z-10 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-background", meta.cls)}>
              <Icon className="size-4" />
            </span>
            <div className={cn("flex-1 rounded-2xl border border-border bg-card p-4", past && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase", meta.cls)}>{it.type}</span>
                <h2 className="font-heading text-sm font-bold text-foreground">{it.title}</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(it.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              </div>
              {it.note && <p className="mt-1 text-xs text-muted-foreground">{it.note}</p>}
              {days != null && (
                <p className={cn("mt-1.5 text-[11px] font-semibold", past ? "text-muted-foreground" : "text-primary")}>
                  {past ? "Đã ra mắt" : days === 0 ? "Ra mắt hôm nay!" : `Còn ${days} ngày`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
