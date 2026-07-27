"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Wrench, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceWindow, ServerStatusKind, SERVER_STATUS } from "@/lib/data/ff-server-status";

type StatusData = typeof SERVER_STATUS;

const META: Record<ServerStatusKind, { label: string; icon: typeof CheckCircle2; ring: string; dot: string; text: string; bg: string }> = {
  operational: { label: "Hoạt động bình thường", icon: CheckCircle2, ring: "ring-emerald-500/30", dot: "bg-emerald-500", text: "text-emerald-500", bg: "from-emerald-500/10" },
  maintenance: { label: "Đang bảo trì",           icon: Wrench,       ring: "ring-amber-500/30",   dot: "bg-amber-500",   text: "text-amber-500",   bg: "from-amber-500/10" },
  issues:      { label: "Đang gặp sự cố",         icon: AlertTriangle, ring: "ring-rose-500/30",   dot: "bg-rose-500",    text: "text-rose-500",    bg: "from-rose-500/10" },
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} ngày ${h % 24} giờ`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtWindow(w: MaintenanceWindow) {
  const s = new Date(w.start);
  const e = new Date(w.end);
  const opt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
  return `${s.toLocaleString("vi-VN", opt)} → ${e.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function ServerStatus({ data }: { data: StatusData }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const upcoming = useMemo(
    () => [...data.maintenance].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [data.maintenance],
  );

  // Cửa sổ bảo trì đang diễn ra
  const active = now == null ? null : upcoming.find((w) => now >= new Date(w.start).getTime() && now < new Date(w.end).getTime()) ?? null;
  // Cửa sổ bảo trì tiếp theo (chưa bắt đầu)
  const next = now == null ? null : upcoming.find((w) => new Date(w.start).getTime() > now) ?? null;

  const status: ServerStatusKind = active ? "maintenance" : data.manualOverride?.status ?? "operational";
  const meta = META[status];
  const Icon = meta.icon;

  const message = active
    ? `Đang bảo trì${active.note ? `: ${active.note}` : ""}`
    : data.manualOverride?.message ?? "Máy chủ đang hoạt động bình thường.";

  return (
    <div className="space-y-5">
      {/* Trạng thái hiện tại */}
      <div className={cn("relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br to-card p-6 ring-1 md:p-8", meta.bg, meta.ring)}>
        <div className="relative flex items-center gap-4">
          <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background/60", meta.text)}>
            <Icon className="size-7" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", meta.dot, now != null && "animate-pulse")} />
              <h2 className={cn("font-heading text-xl font-black uppercase tracking-tight md:text-2xl", meta.text)}>
                {now == null ? "Đang kiểm tra..." : meta.label}
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{now == null ? "" : message}</p>
            {active && now != null && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                <Clock className="size-3.5" /> Dự kiến xong sau {fmt(new Date(active.end).getTime() - now)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bảo trì sắp tới */}
      {next && now != null && !active && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="size-4 text-amber-500" />
            <span className="font-heading text-sm font-bold text-foreground">Bảo trì sắp tới</span>
            <span className="ml-auto text-xs text-muted-foreground">{fmtWindow(next)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {next.note ? `${next.note} · ` : ""}Còn <b className="text-amber-500">{fmt(new Date(next.start).getTime() - now)}</b>
          </p>
        </div>
      )}

      {/* Lịch bảo trì */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Lịch bảo trì</p>
          {upcoming.map((w, i) => {
            const isActive = active === w;
            const isPast = now != null && now >= new Date(w.end).getTime();
            return (
              <div key={i} className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm", isPast && "opacity-50")}>
                <Wrench className={cn("size-4", isActive ? "text-amber-500" : "text-muted-foreground")} />
                <span className="font-medium text-foreground">{w.note ?? "Bảo trì máy chủ"}</span>
                {w.region && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{w.region}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{fmtWindow(w)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Trang tham khảo của cộng đồng (không phải trạng thái chính thức từ Garena). Xem thêm{" "}
        <Link href="/countdown" className="text-primary hover:underline">đếm ngược sự kiện</Link>.
      </p>
    </div>
  );
}
