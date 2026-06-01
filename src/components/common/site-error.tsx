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
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
        <AlertTriangle className="size-7 text-amber-500" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error?.digest && (
          <p className="font-mono text-[10px] text-muted-foreground/50">#{error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
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
