import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { haptic } from "@/lib/native";

/** Thanh tiêu đề cho màn hình con trong tab Hệ thống. */
export function SubHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={() => {
          haptic("light");
          navigate(-1);
        }}
        className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-xl text-mist-300 transition active:bg-ink-800"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] leading-tight font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] text-mist-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
