import { getEventServer } from "@/lib/constants/event-servers";
import { cn } from "@/lib/utils";

type Props = {
  serverKey?: string | null;
  className?: string;
  variant?: "compact" | "full";
};

export function ServerBadge({ serverKey, className, variant = "compact" }: Props) {
  const meta = getEventServer(serverKey);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        meta.color,
        className,
      )}
      title={`Server ${meta.label}`}
    >
      <span aria-hidden>{meta.flag}</span>
      <span>{variant === "full" ? meta.label : meta.short}</span>
    </span>
  );
}
