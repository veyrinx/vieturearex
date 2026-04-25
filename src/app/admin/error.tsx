"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged server-side; no client logging needed
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
          Đã xảy ra lỗi
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Trang quản trị gặp sự cố. Vui lòng thử lại hoặc liên hệ IT nếu lỗi tiếp tục.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">#{error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" className="rounded-xl">
          Thử lại
        </Button>
        <Button onClick={() => window.location.href = "/admin"} className="rounded-xl">
          Về Dashboard
        </Button>
      </div>
    </div>
  );
}
