import { getEventServer, type EventServer } from "@/lib/constants/event-servers";
import { cn } from "@/lib/utils";

type Props = {
  serverKey?: string | null;
  /** Optional pre-resolved server (when caller already has merged list). */
  server?: EventServer | null;
  className?: string;
  variant?: "compact" | "full";
};

export function ServerBadge({ serverKey, server, className, variant = "compact" }: Props) {
  const meta = server ?? getEventServer(serverKey);
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
      {meta.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.logoUrl}
          alt={meta.label}
          className="size-3.5 rounded-sm object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden>{meta.flag}</span>
      )}
      <span>{variant === "full" ? meta.label : meta.short}</span>
    </span>
  );
}
