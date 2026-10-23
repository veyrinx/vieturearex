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
