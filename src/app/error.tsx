"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface to the browser console so users can copy the stack
    console.error("[ErrorBoundary]", error);
  }, [error]);

  const message =
    typeof error?.message === "string" && error.message
      ? error.message
      : "Vui lòng thử lại. Nếu lỗi vẫn xảy ra, liên hệ quản trị viên.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="font-heading text-2xl font-black text-foreground">Đã xảy ra lỗi</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {error?.digest && (
          <p className="font-mono text-[10px] text-muted-foreground/70">digest: {error.digest}</p>
        )}
        <Button onClick={reset} className="rounded-xl">
          Thử lại
        </Button>
      </div>
    </main>
  );
}
