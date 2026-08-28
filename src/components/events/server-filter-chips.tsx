"use client";

import { useMemo } from "react";
import { useEventServers } from "@/hooks/use-event-servers";
import { cn } from "@/lib/utils";

type CountableEvent = { server_region?: string | null };

type Props = {
  /** Tập sự kiện dùng để đếm — truyền vào tập ĐÃ lọc mọi thứ trừ server. */
  events: CountableEvent[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

/**
 * Hàng chip lọc theo server, dùng chung cho trang sự kiện và timeline.
 *
 * Chỉ hiện server thật sự có sự kiện (cộng server đang chọn, để chip không
 * biến mất ngay dưới ngón tay khi lọc thêm ngày). Danh sách preset có 11
 * server nhưng cộng đồng chỉ chạy vài server — bày đủ 11 chip mà 9 chip bấm
 * vào ra rỗng thì người dùng tưởng trang hỏng.
 */
export function ServerFilterChips({ events, value, onChange, className }: Props) {
  const eventServers = useEventServers();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const key = (event.server_region ?? "").toLowerCase();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const shown = useMemo(
    () => eventServers.filter((s) => (counts.get(s.key) ?? 0) > 0 || s.key === value),
    [eventServers, counts, value],
  );

  if (shown.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SERVER:</span>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition",
          value === "all"
            ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400"
            : "border-border bg-muted text-muted-foreground hover:border-primary/40",
        )}
      >
        Tất cả
        <span className="ml-1 opacity-60">{events.length}</span>
      </button>
      {shown.map((s) => {
        const count = counts.get(s.key) ?? 0;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition",
              value === s.key
                ? s.color
                : "border-border bg-muted text-muted-foreground hover:border-primary/40",
            )}
            title={`Server ${s.label} — ${count} sự kiện`}
          >
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logoUrl} alt="" className="size-3.5 rounded-sm object-cover" loading="lazy" />
            ) : (
              <span aria-hidden>{s.flag}</span>
            )}
            {s.short}
            <span className="opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
