import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TmsServer } from "@/lib/tms/types";

const VN_FLAG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Crect width='30' height='20' fill='%23DA251D'/%3E%3Cpolygon points='15,3.5 16.9,9.3 23,9.3 18.1,13 20,18.8 15,15.1 10,18.8 11.9,13 7,9.3 13.1,9.3' fill='%23FFCD00'/%3E%3C/svg%3E`;

const SG_FLAG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Crect width='30' height='20' fill='white'/%3E%3Crect width='30' height='10' fill='%23EF3340'/%3E%3Ccircle cx='7' cy='5' r='3' fill='white'/%3E%3Ccircle cx='8.3' cy='5' r='2.4' fill='%23EF3340'/%3E%3Cpolygon points='12,3.5 12.5,5 14,5 12.8,5.9 13.3,7.4 12,6.5 10.7,7.4 11.2,5.9 10,5 11.5,5' fill='white'/%3E%3Cpolygon points='13.5,1.5 13.9,2.7 15.1,2.7 14.1,3.4 14.5,4.6 13.5,3.9 12.5,4.6 12.9,3.4 11.9,2.7 13.1,2.7' fill='white'/%3E%3C/svg%3E`;

const SERVER_META: Record<TmsServer, { label: string; short: string; flag?: string; color: string }> = {
  vn:     { label: "VN Server",     short: "VN",     flag: VN_FLAG, color: "border-red-500/30 bg-red-500/10 text-red-400" },
  sg:     { label: "SG/SEA Server", short: "SG/SEA", flag: SG_FLAG, color: "border-red-500/30 bg-red-500/10 text-red-400" },
  global: { label: "Global",        short: "GLB",                   color: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
};

type Props = {
  server: TmsServer;
  variant?: "compact" | "full";
  className?: string;
};

export function TmsServerBadge({ server, variant = "compact", className }: Props) {
  const meta = SERVER_META[server];
  if (!meta) return null;
  const label = variant === "full" ? meta.label : meta.short;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        meta.color,
        className,
      )}
      title={meta.label}
    >
      {meta.flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.flag} alt={meta.label} width={16} height={11} className="rounded-sm" />
      ) : (
        <Globe className="size-3" />
      )}
      {label}
    </span>
  );
}
