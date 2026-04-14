import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/lib/types/content";

const statusMap: Record<EventStatus, { label: string; className: string }> = {
  active: {
    label: "ĐANG HOẠT ĐỘNG",
    className:
      "border-[#ffb45c] bg-[#ff9800] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:border-[#ffb45c] dark:text-white dark:shadow-[0_4px_12px_rgba(0,0,0,0.38)]",
  },
  upcoming: {
    label: "SẮP RA MẮT",
    className:
      "border-[#81c784] bg-[#4CAF50] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:border-[#81c784] dark:text-white dark:shadow-[0_4px_12px_rgba(0,0,0,0.38)]",
  },
  expired: {
    label: "ĐÃ KẾT THÚC",
    className:
      "border-[#ef5350] bg-[#f44336] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:border-[#ef5350] dark:text-white dark:shadow-[0_4px_12px_rgba(0,0,0,0.38)]",
  },
};

type StatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-3 py-1 text-[0.72rem] font-bold uppercase leading-none tracking-[0.06em]",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
