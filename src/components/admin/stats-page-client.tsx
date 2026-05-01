"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { BarChart3, Trophy, Newspaper, RefreshCw, CalendarDays, Calendar } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { getRank } from "@/lib/constants/ranks";
import { cn } from "@/lib/utils";

type StatsData = {
  chart: { date: string; views: number }[];
  byYear: { key: string; views: number }[];
  byMonth: { key: string; views: number }[];
  topNews: { id: string; title: string; slug: string; comments: number }[];
  leaderboard: { id: string; display_name: string | null; points: number; rank: string }[];
};

const CHART_COLORS = ["#0052FF", "#4D7CFF", "#80A0FF", "#B3C4FF", "#D9E4FF"];

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function StatsPageClient() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setData(await res.json() as StatsData);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em]">THỐNG KÊ CHI TIẾT</h1>
          <p className="text-sm text-muted-foreground">Lượt xem 30 ngày, bài viết nổi bật, bảng xếp hạng thành viên.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading} className="gap-1.5 rounded-xl">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {loading ? <LoadingSpinner className="py-20" label="ĐANG TẢI DỮ LIỆU..." /> : !data ? (
        <p className="text-muted-foreground">Không tải được dữ liệu.</p>
      ) : (
        <div className="space-y-8">
          {/* Daily views line chart */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary dark:text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Lượt xem 30 ngày</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 10 }}
                  interval={4}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  labelFormatter={(v) => shortDate(String(v))}
                  formatter={(v) => [Number(v).toLocaleString("vi-VN"), "Lượt xem"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Line
                  type="monotone" dataKey="views" stroke="#0052FF"
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Year / Month breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By year */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary dark:text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Lượt xem theo năm</h2>
              </div>
              {data.byYear.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
              ) : (
                <ul className="space-y-2">
                  {data.byYear.map(({ key, views }) => (
                    <li key={key} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-sm font-bold font-mono text-foreground">{key}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary dark:bg-amber-400 transition-all"
                          style={{ width: `${Math.round((views / Math.max(...data.byYear.map(y => y.views))) * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-primary dark:text-amber-400">
                        {views.toLocaleString("vi-VN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* By month */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary dark:text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Lượt xem theo tháng</h2>
              </div>
              {data.byMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.byMonth.length * 28)}>
                  <BarChart data={data.byMonth} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="key" width={56} tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v) => [Number(v).toLocaleString("vi-VN"), "Lượt xem"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                      {data.byMonth.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top news by comments */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="size-4 text-primary dark:text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Bài viết nhiều bình luận nhất</h2>
              </div>
              {data.topNews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.topNews} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="title" width={120}
                        tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(0, 18) + (v.length > 18 ? "…" : "")}
                        stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v) => [Number(v), "Bình luận"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="comments" radius={[0, 4, 4, 0]}>
                        {data.topNews.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <ul className="space-y-1.5">
                    {data.topNews.map((n, i) => (
                      <li key={n.id} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-[11px] font-bold text-muted-foreground">#{i + 1}</span>
                        <Link href={`/news/${n.slug}`} className="flex-1 truncate text-foreground hover:text-primary transition-colors">
                          {n.title}
                        </Link>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{n.comments} BL</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Points leaderboard */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary dark:text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Bảng xếp hạng thành viên</h2>
              </div>
              {data.leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
              ) : (
                <ul className="space-y-2">
                  {data.leaderboard.map((u, i) => {
                    const rankMeta = getRank(u.points);
                    return (
                      <li key={u.id} className="flex items-center gap-3">
                        <span className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                          i === 0 && "bg-yellow-500/20 text-yellow-500",
                          i === 1 && "bg-slate-400/20 text-slate-400",
                          i === 2 && "bg-amber-700/20 text-amber-700",
                          i > 2 && "bg-muted text-muted-foreground",
                        )}>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-foreground">
                          {u.display_name ?? "Thành viên"}
                        </span>
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          rankMeta.bg, rankMeta.color,
                        )}>
                          {u.rank}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-primary dark:text-amber-400">
                          {u.points.toLocaleString("vi-VN")} pts
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
