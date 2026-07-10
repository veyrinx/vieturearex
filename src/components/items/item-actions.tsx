"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

export function ItemActions({ imageUrl, id }: { imageUrl: string; id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      toast.success("Đã copy URL ảnh");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không copy được. Thử lại.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-90 dark:bg-amber-500"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Đã copy" : "Copy URL"}
      </button>
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40"
      >
        <ExternalLink className="size-3.5" /> Mở ảnh
      </a>
      <a
        href={imageUrl}
        download={`${id}.png`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40"
      >
        <Download className="size-3.5" /> Tải xuống
      </a>
    </div>
  );
}
