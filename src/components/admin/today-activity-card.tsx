"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Newspaper, CalendarRange, MessageSquare, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TodayStats = {
  newUsers: number;
  newNews: number;
  newEvents: number;
  pendingComments: number;
};

const ITEMS = [
  { key: "newUsers",       label: "Thành viên mới",    icon: Users,       color: "text-blue-500",   bg: "bg-blue-500/10",   href: "/admin/users" },
  { key: "newNews",        label: "Bài viết mới",      icon: Newspaper,   color: "text-purple-500", bg: "bg-purple-500/10", href: "/admin/news" },
  { key: "newEvents",      label: "Sự kiện mới",       icon: CalendarRange, color: "text-amber-500", bg: "bg-amber-500/10",  href: "/admin/events" },
  { key: "pendingComments", label: "Chờ kiểm duyệt",  icon: MessageSquare, color: "text-rose-500",  bg: "bg-rose-500/10",   href: "/admin/comments" },
] as const;

export function TodayActivityCard() {
  const [data, setData] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats/today");
      if (res.ok) setData(await res.json() as TodayStats);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary dark:text-amber-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Hôm nay</h2>
            <p className="text-[10px] text-muted-foreground/60 capitalize">{today}</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => void load()} disabled={loading} className="size-7 rounded-lg">
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ITEMS.map(({ key, label, icon: Icon, color, bg, href }) => {
          const value = data?.[key] ?? 0;
          return (
            <Link
              key={key}
              href={href}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-background/50 p-3 transition-all hover:border-primary/30 hover:bg-primary/4"
            >
              <div className={cn("flex size-8 items-center justify-center rounded-lg", bg)}>
                <Icon className={cn("size-4", color)} />
              </div>
              <div>
                {loading ? (
                  <div className="h-5 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  <p className={cn("text-lg font-black leading-none", value > 0 ? color : "text-foreground")}>
                    {value}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
