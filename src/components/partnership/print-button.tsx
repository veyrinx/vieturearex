"use client";

import { Printer } from "lucide-react";

/** In hoặc "Lưu thành PDF" — hộp thoại in của trình duyệt lo phần còn lại. */
export function PrintContractButton({ label = "In / lưu PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground print:hidden"
    >
      <Printer className="size-3.5" /> {label}
    </button>
  );
}
