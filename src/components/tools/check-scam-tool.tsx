"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Search, ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Tra cứu hồ sơ rủi ro giao dịch.
 *
 * Dữ liệu là tranh chấp trong chợ Arex đã được đội ngũ xử "hoàn tiền người
 * mua" — tức có người thật mất tiền và đã có kết luận, không phải tố cáo suông.
 * Nói rõ điều đó trên giao diện để người dùng biết "không tìm thấy" nghĩa là gì.
 */

interface Hit {
  type: string;
  typeLabel: string;
  severity: "info" | "warning" | "danger";
  note: string;
  source: "dispute" | "admin";
  created_at: string;
}

interface LookupResponse {
  query?: string;
  clean?: boolean;
  worst?: "info" | "warning" | "danger" | null;
  triedTypes?: { type: string; label: string }[];
  hits?: Hit[];
  error?: string;
}

const SEVERITY_STYLE: Record<Hit["severity"], string> = {
  info: "border-sky-500/30 bg-sky-500/5 text-sky-500",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-500",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-500",
};

const SEVERITY_LABEL: Record<Hit["severity"], string> = {
  info: "Ghi nhận",
  warning: "Cảnh báo",
  danger: "Nguy hiểm",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN");
}

export function CheckScamTool() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResponse | null>(null);

  async function lookup() {
    const q = query.trim();
    if (q.length < 3) {
      setError("Nhập ít nhất 3 ký tự.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/check-scam?q=${encodeURIComponent(q)}`);
      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok) {
        setError(json.error || "Không tra cứu được.");
        setResult(null);
      } else {
        setResult(json);
      }
    } catch {
      setError("Lỗi mạng, thử lại sau.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const hits = result?.hits ?? [];

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 100))}
            placeholder="SĐT, số tài khoản, UID game, link Zalo/Facebook hoặc họ tên"
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Kiểm tra
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {result && hits.length === 0 && (
        <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <ShieldCheck className="size-5 shrink-0" />
            Chưa có cảnh báo nào cho &ldquo;{result.query}&rdquo;
          </div>
          {/* Đây là điểm dễ hiểu nhầm nhất: sạch hồ sơ KHÔNG phải là chứng nhận
              an toàn. Nói thẳng thay vì để người dùng tự suy. */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nghĩa là định danh này chưa từng dính tranh chấp nào đã xử trong chợ Arex — không phải là
            bảo chứng người đó uy tín. Vẫn nên giao dịch qua trung gian.
          </p>
        </div>
      )}

      {hits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-500">
            <ShieldAlert className="size-5 shrink-0" />
            Tìm thấy {hits.length} cảnh báo cho &ldquo;{result?.query}&rdquo;
          </div>

          {hits.map((h, i) => (
            <div
              key={`${h.type}-${h.created_at}-${i}`}
              className={`space-y-2 rounded-2xl border p-4 ${SEVERITY_STYLE[h.severity]}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-current px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  {SEVERITY_LABEL[h.severity]}
                </span>
                <span className="text-xs font-bold">{h.typeLabel}</span>
                <span className="text-[11px] opacity-70">
                  {h.source === "dispute" ? "Từ tranh chấp chợ Arex" : "Đội ngũ ghi nhận"} · {fmtDate(h.created_at)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">{h.note}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Nguồn dữ liệu: tranh chấp trong chợ Arex đã được xử &ldquo;hoàn tiền người mua&rdquo;, cộng
        với ghi nhận thủ công của đội ngũ. Cảnh báo sai có thể khiếu nại để gỡ.
      </p>
    </div>
  );
}
