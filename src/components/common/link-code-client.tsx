"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, Copy, Check, Loader2, LogIn } from "lucide-react";

/**
 * Ô tạo mã liên kết tài khoản dùng chung cho Telegram / Zalo: gọi API tạo mã 6
 * ký tự sống 10 phút, đếm ngược, bấm để copy. Mỗi kênh chỉ khác endpoint + chữ.
 */
export type LinkCodeClientProps = {
  /** API POST trả { code, expiresInSec } */
  endpoint: string;
  /** Đường dẫn quay lại sau khi đăng nhập */
  loginNext: string;
  /** Câu hướng dẫn ngay dưới mã */
  codeHint: string;
  /** Các bước hướng dẫn ở khối dưới cùng */
  steps: string[];
  footNote?: string;
  ctaLabel?: string;
};

export function LinkCodeClient({
  endpoint,
  loginNext,
  codeHint,
  steps,
  footNote,
  ctaLabel = "Tạo mã liên kết",
}: LinkCodeClientProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (res.status === 401) { setNeedLogin(true); return; }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Không tạo được mã.");
      setCode(json.code);
      setLeft(json.expiresInSec ?? 600);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const mm = Math.floor(left / 60);
  const ss = (left % 60).toString().padStart(2, "0");
  const expired = code !== null && left <= 0;

  if (needLogin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Bạn cần đăng nhập để tạo mã liên kết.</p>
        <Link
          href={`/login?next=${loginNext}`}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          <LogIn className="size-4" /> Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        {code && !expired ? (
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mã liên kết của bạn</p>
            <button
              onClick={copy}
              className="mx-auto flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-4"
            >
              <span className="font-heading text-4xl font-black tracking-[0.3em] text-foreground">{code}</span>
              {copied ? <Check className="size-5 text-emerald-500" /> : <Copy className="size-5 text-muted-foreground" />}
            </button>
            <p className="text-sm text-muted-foreground">
              Hết hạn sau <b className="tabular-nums text-foreground">{mm}:{ss}</b> — {codeHint}
            </p>
            <button onClick={generate} disabled={loading} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
              Tạo mã khác
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {expired && <p className="text-sm font-semibold text-amber-500">Mã đã hết hạn.</p>}
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {expired ? "Tạo mã mới" : ctaLabel}
            </button>
          </div>
        )}
      </div>

      <ol className="space-y-2 rounded-2xl border border-border bg-card/50 p-5 text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i}>
            <b className="text-foreground">{i + 1}.</b> {step}
          </li>
        ))}
        {footNote && <li className="pt-1 text-xs">{footNote}</li>}
      </ol>
    </div>
  );
}
