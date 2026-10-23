import { BadgeCheck } from "lucide-react";
import { VERIFIED_BADGE_DISCLAIMER } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

/**
 * Dấu tick xác minh creator. Luôn kèm lời giải thích "do ArexNetwork cấp" —
 * ở tooltip (title) và cho trình đọc màn hình — để không ai hiểu nhầm là
 * xác nhận của Garena.
 */
export function VerifiedBadge({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 text-sky-600 dark:text-sky-400", className)}
      title={VERIFIED_BADGE_DISCLAIMER}
    >
      <BadgeCheck className="size-4" aria-hidden />
      {withLabel ? (
        <span className="text-xs font-semibold">Xác minh bởi ArexNetwork</span>
      ) : (
        <span className="sr-only">Creator đã xác minh bởi ArexNetwork (không phải xác nhận của Garena)</span>
      )}
    </span>
  );
}
