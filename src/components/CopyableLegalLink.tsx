"use client";

import { useEffect, useRef, useState } from "react";

export function CopyableLegalLink({ label, url }: { label: string; url?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const textToCopy = label.trim();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const helper = document.createElement("textarea");
        helper.value = textToCopy;
        helper.setAttribute("readonly", "");
        helper.style.position = "absolute";
        helper.style.left = "-9999px";
        document.body.appendChild(helper);
        helper.select();

        const copiedByFallback = document.execCommand("copy");
        document.body.removeChild(helper);

        if (!copiedByFallback) {
          throw new Error("Clipboard unavailable");
        }
      }

      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      setStatus("idle");
    }, 2200);
  };

  const sourceHost = (() => {
    if (!url) {
      return null;
    }

    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  return (
    <button
      onClick={handleCopy}
      type="button"
      title="Nhấn để sao chép tên văn bản, không mở liên kết"
      aria-label={`Sao chép tên văn bản: ${label}`}
      className="group relative flex w-full flex-col justify-center rounded-xl border border-border/60 bg-background/50 px-4 py-4 text-left transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-sm dark:hover:border-amber-400/40 dark:hover:bg-amber-400/5 focus:outline-none focus:ring-2 focus:ring-primary/50 md:px-5 md:py-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:group-hover:bg-amber-400/10 dark:group-hover:text-amber-400 md:h-11 md:w-11">
          {status === "copied" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold tracking-[0.03em] text-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400 md:text-base xl:text-[17px]">
            {label}
          </p>
          <p
            aria-live="polite"
            className="mt-1 text-xs font-semibold text-muted-foreground/80 transition-colors group-hover:text-primary/70 dark:group-hover:text-amber-400/70 md:text-sm"
          >
            {status === "copied" && "✓ Đã sao chép tên văn bản vào bộ nhớ tạm"}
            {status === "failed" && "Không thể sao chép tự động, vui lòng thử lại"}
            {status === "idle" && "Nhấn để sao chép nội dung text, không mở liên kết"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground/65 md:text-xs">
            <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1">
              Copy text
            </span>
            {sourceHost ? (
              <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1">
                Nguồn tra cứu: {sourceHost}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
