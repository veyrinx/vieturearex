import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TmsServer } from "@/lib/tms/types";

const SERVER_META: Record<TmsServer, { label: string; short: string; flag?: string; color: string }> = {
  vn:     { label: "VN Server",     short: "VN",     flag: "https://flagcdn.com/w20/vn.png", color: "border-red-500/30 bg-red-500/10 text-red-400" },
  sg:     { label: "SG/SEA Server", short: "SG/SEA", flag: "https://flagcdn.com/w20/sg.png", color: "border-red-500/30 bg-red-500/10 text-red-400" },
  global: { label: "Global",        short: "GLB",                                             color: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
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
        <img src={meta.flag} alt={meta.label} className="h-3 w-4 rounded-sm object-cover" loading="lazy" decoding="async" />
      ) : (
        <Globe className="size-3" />
      )}
      {label}
    </span>
  );
}
