"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, BellDot, CheckCheck, Trophy, Swords, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/server/notifications";

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  registration_approved:  { icon: Trophy,   color: "text-emerald-400" },
  registration_rejected:  { icon: X,        color: "text-red-400" },
  match_scheduled:        { icon: Calendar, color: "text-primary dark:text-amber-400" },
  match_result:           { icon: Swords,   color: "text-amber-400" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(() => {
    fetch("/api/notifications?count=true", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openPanel = async () => {
    if (!open && !loaded) {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (res.ok) setNotifications((await res.json()) as Notification[]);
      setLoaded(true);
    }
    setOpen((p) => !p);
    if (!open && count > 0) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ all: true }),
      });
      setCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => void openPanel()}
        aria-label="Thông báo"
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-xl transition-colors",
          className ?? "theme-control-surface",
        )}
      >
        {count > 0
          ? <BellDot className="size-[17px]" />
          : <Bell className="size-[17px]" />
        }
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-widest">Thông báo</span>
            {notifications.some((n) => !n.read_at) && (
              <button
                onClick={() => {
                  void fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ all: true }),
                  });
                  setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
                  setCount(0);
                }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="size-3" /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="size-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-muted-foreground" };
                const Icon = meta.icon;
                const Wrapper = n.entity_url ? Link : "div";
                return (
                  <Wrapper
                    key={n.id}
                    href={n.entity_url ?? "#"}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-t border-border/50 first:border-0",
                      !n.read_at && "bg-primary/5 dark:bg-amber-400/5",
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0 rounded-lg border border-border bg-muted p-1.5", meta.color)}>
                      <Icon className="size-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold leading-tight", !n.read_at && "text-foreground")}>{n.title}</p>
                      {n.body && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </Wrapper>
                );
              })
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <Link href="/tournaments" onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Xem giải đấu →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
