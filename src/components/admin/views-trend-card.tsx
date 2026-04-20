"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "same";

type TrendsData = {
  today: number;
  yesterday: number;
  todayTrend: Trend;
  weekCurrent: number;
  weekPrev: number;
  weekTrend: Trend;
  monthCurrent: number;
  monthPrev: number;
  monthTrend: Trend;
  chart: Array<{ date: string; views: number }>;
};

function TrendBadge({ trend, value, prev }: { trend: Trend; value: number; prev: number }) {
  const pct = prev === 0 ? (value > 0 ? 100 : 0) : Math.round(((value - prev) / prev) * 100);
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
      trend === "up" && "bg-green-500/10 text-green-500",
      trend === "down" && "bg-red-500/10 text-red-500",
      trend === "same" && "bg-yellow-500/10 text-yellow-500",
    )}>
      <Icon className="size-3" />
      {trend === "same" ? "Không đổi" : `${trend === "up" ? "+" : ""}${pct}%`}
    </span>
  );
}

function MiniBar({ chart }: { chart: TrendsData["chart"] }) {
  const safeChart = chart ?? [];
  const max = Math.max(...safeChart.map((c) => c.views), 1);
  return (
    <div className="flex h-12 items-end gap-px">
      {safeChart.map((c) => (
        <div
          key={c.date}
          title={`${c.date}: ${c.views}`}
          className="flex-1 rounded-sm bg-primary/40 transition-all hover:bg-primary/70"
          style={{ height: `${Math.max(4, Math.round((c.views / max) * 48))}px` }}
        />
      ))}
    </div>
  );
}

export function ViewsTrendCard() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/trends")
      .then((r) => r.ok ? r.json() : null)
      .then((d: TrendsData | null) => { if (d?.chart) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Hôm nay", value: data.today, trend: data.todayTrend, prev: data.yesterday },
    { label: "Tuần này", value: data.weekCurrent, trend: data.weekTrend, prev: data.weekPrev },
    { label: "Tháng này", value: data.monthCurrent, trend: data.monthTrend, prev: data.monthPrev },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-primary dark:text-amber-400" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Phân tích lượt xem
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, trend, prev }) => (
          <div key={label} className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="font-heading text-xl font-black text-foreground">{Number(value ?? 0).toLocaleString("vi-VN")}</p>
            <TrendBadge trend={trend} value={value} prev={prev} />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">30 ngày gần nhất</p>
        <MiniBar chart={data.chart} />
      </div>
    </div>
  );
}
