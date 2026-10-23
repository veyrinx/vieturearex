"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const nf = new Intl.NumberFormat("vi-VN");

function shortDay(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

/**
 * Một chuỗi theo ngày (lượt xem...). Một chuỗi → không cần chú giải, tiêu đề
 * phía trên đã gọi tên. Có crosshair + tooltip khi rê chuột.
 */
export function DailyAreaChart({
  data,
  dataKey,
  label,
  height = 240,
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  label: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + Number(d[dataKey] ?? 0), 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground" style={{ height }}>
        Chưa có dữ liệu {label.toLowerCase()} trong khoảng này.
      </div>
    );
  }
  return (
    <div style={{ height }} role="img" aria-label={`Biểu đồ ${label} theo ngày, tổng ${nf.format(total)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--popover-foreground))" }}
            labelFormatter={(d) => shortDay(String(d))}
            formatter={(v) => [nf.format(Number(v)), label]}
          />
          <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#fill-${dataKey})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Thanh ngang một màu cho phân rã (nguồn, thiết bị...). Số in thẳng cạnh thanh. */
export function BreakdownBars({
  rows,
  labelFor,
  emptyText = "Chưa có dữ liệu.",
}: {
  rows: Array<{ key: string; total: number }>;
  labelFor?: (key: string) => string;
  emptyText?: string;
}) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="group" title={`${labelFor?.(r.key) ?? r.key}: ${nf.format(r.total)} (${Math.round((r.total / sum) * 100)}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{labelFor?.(r.key) ?? r.key}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{nf.format(r.total)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatTile({ label, value, hint, sub }: { label: string; value: string; hint?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {hint && (
          <span className="cursor-help rounded-full border border-border px-1 text-[10px] leading-4" title={hint} aria-label={hint}>?</span>
        )}
      </div>
      <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
