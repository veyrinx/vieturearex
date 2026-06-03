"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function SiteError({
  error,
  reset,
  title = "Đã xảy ra lỗi",
  description = "Vui lòng thử lại. Nếu lỗi vẫn xảy ra, liên hệ quản trị viên.",
  backHref = "/",
  backLabel = "Về trang chủ",
}: Props) {
  useEffect(() => { console.error("[SiteError]", error); }, [error]);

  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 overflow-hidden px-4 py-16 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/5 blur-[80px]" />
      </div>

      {/* Icon */}
      <div className="flex size-20 items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/8 shadow-lg">
        <AlertTriangle className="size-9 text-rose-500" />
      </div>

      {/* Text */}
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {error?.digest && (
          <p className="font-mono text-[10px] text-muted-foreground/50">Mã lỗi: #{error.digest}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2 rounded-xl">
          <RefreshCw className="size-3.5" /> Thử lại
        </Button>
        <Button asChild className="gap-2 rounded-xl">
          <Link href={backHref}>
            <Home className="size-3.5" /> {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
