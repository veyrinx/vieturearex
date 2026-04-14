"use client";

import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <div className="glass-card w-full space-y-4 rounded-2xl p-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">Đã xảy ra lỗi</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={reset} className="rounded-xl">
          Thử lại
        </Button>
      </div>
    </main>
  );
}
