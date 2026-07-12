import Link from "next/link";
import { ArrowRight, LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  color?: "blue" | "orange" | "purple" | "green" | "red";
  sub?: string;
  trend?: number | null;
};

function TrendBadge({ pct }: { pct: number }) {
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
      pct > 0 && "bg-green-500/10 text-green-500",
      pct < 0 && "bg-red-500/10 text-red-500",
      pct === 0 && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
    )}>
      <Icon className="size-3" />
      {pct > 0 ? "+" : ""}{pct}%
      <span className="font-normal opacity-60">7 ngày</span>
    </span>
  );
}

const COLOR_MAP = {
  blue:   { icon: "bg-blue-500/10 text-blue-500 border-blue-500/20",   glow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]", bar: "from-blue-500/20 to-transparent", num: "text-blue-600 dark:text-blue-400" },
  orange: { icon: "bg-amber-500/10 text-amber-500 border-amber-500/20", glow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]", bar: "from-amber-500/20 to-transparent", num: "text-amber-600 dark:text-amber-400" },
  purple: { icon: "bg-purple-500/10 text-purple-500 border-purple-500/20", glow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]", bar: "from-purple-500/20 to-transparent", num: "text-purple-600 dark:text-purple-400" },
  green:  { icon: "bg-green-500/10 text-green-500 border-green-500/20",  glow: "hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)]",  bar: "from-green-500/20 to-transparent",  num: "text-green-600 dark:text-green-400" },
  red:    { icon: "bg-red-500/10 text-red-500 border-red-500/20",        glow: "hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]",   bar: "from-red-500/20 to-transparent",    num: "text-red-600 dark:text-red-400" },
};

export function StatsCard({ title, value, icon: Icon, href, color = "blue", sub, trend }: StatsCardProps) {
  const c = COLOR_MAP[color];

  const inner = (
    <article className={cn(
      "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300",
      href && "cursor-pointer hover:-translate-y-0.5",
      c.glow,
    )}>
      {/* Top gradient bar */}
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", c.bar)} />
      {/* Glow orb */}
      <div className={cn("pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80", c.bar)} />
      {/* Watermark icon */}
      <Icon className={cn("pointer-events-none absolute -bottom-5 -right-4 size-28 opacity-[0.055] transition-transform duration-500 group-hover:scale-110", c.num)} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
          <p className={cn("mt-2 font-heading text-[2rem] font-black leading-none tabular-nums", c.num)}>{value}</p>
          {typeof trend === "number" && (
            <div className="mt-2">
              <TrendBadge pct={trend} />
            </div>
          )}
          {sub && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="size-3" />
              <span>{sub}</span>
            </div>
          )}
        </div>
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", c.icon)}>
          <Icon className="size-5" />
        </div>
      </div>

      {href && (
        <div className="relative z-10 mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
          Xem chi tiết
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </article>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
