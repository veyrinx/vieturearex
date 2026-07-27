"use client";

import { useState } from "react";
import { Code2, Check, Copy } from "lucide-react";

/** Ô hiển thị mã nhúng iframe của widget BXH + nút copy. */
export function BxhEmbedSnippet({ baseUrl }: { baseUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = `<iframe src="${baseUrl}/embed/top-players-vn?limit=10" width="360" height="480" style="border:0;border-radius:16px;overflow:hidden" loading="lazy" title="BXH nick khủng VN"></iframe>`;

  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Code2 className="size-4 text-primary" /> Nhúng bảng xếp hạng vào web của bạn
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{open ? "Ẩn" : "Lấy mã"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Dán đoạn mã này vào trang web/blog để hiển thị BXH tự cập nhật. Đổi <code className="font-mono">limit</code> để chỉnh số dòng (3–25).
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-xl border border-border bg-[#0d1117] p-3 pr-12 text-[11px] leading-relaxed text-slate-300">
              {code}
            </pre>
            <button
              type="button"
              onClick={copy}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:bg-white/20"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              {copied ? "Đã copy" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
