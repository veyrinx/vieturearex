"use client";

import { FlaskConical } from "lucide-react";

type ExperimentalBadgeProps = {
  enabled?: boolean;
};

export function ExperimentalBadge({ enabled }: ExperimentalBadgeProps) {
  const shouldShow = enabled ?? false; // Production: disabled by default
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] rounded-xl border border-amber-500/35 bg-white/82 px-3 py-2 text-xs font-semibold text-amber-700 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-[#1a1306]/82 dark:text-amber-200 dark:shadow-[0_0_26px_-10px_rgba(247,147,26,0.4)]">
      <span className="inline-flex items-center gap-1.5">
        <FlaskConical className="size-3.5" />
        Trang đang trong giai đoạn thử nghiệm
      </span>
    </div>
  );
}
