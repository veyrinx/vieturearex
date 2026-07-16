"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Chia sẻ trang hiện tại: dùng Web Share API (mobile), fallback copy link.
export function ShareButton({
  title,
  text,
  label = "Chia sẻ",
  className,
}: {
  title?: string;
  text?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        /* người dùng hủy — bỏ qua */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã copy link chia sẻ");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không copy được link");
    }
  }

  return (
    <button
      onClick={share}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4" />}
      {copied ? "Đã copy" : label}
    </button>
  );
}
