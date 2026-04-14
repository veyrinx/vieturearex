import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
};

export function LoadingSpinner({ className, label = "Đang tải..." }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-sm text-primary", className)}>
      <LoaderCircle className="size-4 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

