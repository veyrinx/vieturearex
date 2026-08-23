"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, ShieldAlert, Undo2 } from "lucide-react";

/**
 * Quản lý hồ sơ rủi ro cấp cho /check-scam.
 *
 * Phần lớn cảnh báo do hệ thống tự sinh khi tranh chấp được xử "hoàn tiền người
 * mua" (source = dispute). Panel này để đội ngũ thêm trường hợp ngoài chợ và —
 * quan trọng hơn — GỠ cảnh báo sai.
 */

interface Report {
  id: string;
  subject_type: string;
  subject_value: string;
  severity: "info" | "warning" | "danger";
  note: string;
  source: "dispute" | "admin";
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  uid: "UID game",
  phone: "Số điện thoại",
  bank: "Số tài khoản",
  contact: "Liên hệ",
  name: "Họ tên",
};

const SEVERITY_STYLE: Record<Report["severity"], string> = {
  info: "border-sky-500/30 text-sky-500",
  warning: "border-amber-500/30 text-amber-500",
  danger: "border-rose-500/40 text-rose-500",
};

export function ScamReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    subject_type: "phone",
    subject_value: "",
    severity: "warning",
    note: "",
  });

  const load = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scam-reports${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      const json = (await res.json().catch(() => ({}))) as { reports?: Report[]; error?: string };
      if (!res.ok) toast.error(json.error ?? "Không tải được danh sách.");
      setReports(json.reports ?? []);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/scam-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Không lưu được.");
      } else {
        toast.success("Đã ghi nhận cảnh báo.");
        setForm({ ...form, subject_value: "", note: "" });
        await load(q);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const reason = window.prompt("Lý do gỡ cảnh báo này?");
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) toast.error("Lý do quá ngắn.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/scam-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast.error(json.error ?? "Không gỡ được.");
      else {
        toast.success("Đã gỡ.");
        await load(q);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-black uppercase text-foreground">Hồ sơ rủi ro</h1>
        <p className="text-xs text-muted-foreground">
          Nguồn cho công cụ Check Scam. Cảnh báo &ldquo;từ tranh chấp&rdquo; do hệ thống tự sinh khi
          đơn được xử hoàn tiền người mua.
        </p>
      </div>

      {/* Thêm thủ công */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-foreground">
          <Plus className="size-3.5" /> Ghi nhận thủ công
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={form.subject_type}
            onChange={(e) => setForm({ ...form, subject_type: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            {Object.entries(TYPE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={form.subject_value}
            onChange={(e) => setForm({ ...form, subject_value: e.target.value })}
            placeholder="Giá trị (SĐT, STK, UID…)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="info">Ghi nhận</option>
            <option value="warning">Cảnh báo</option>
            <option value="danger">Nguy hiểm</option>
          </select>
        </div>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={2}
          placeholder="Lý do — mô tả vụ việc, dẫn chứng (ít nhất 10 ký tự)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={() => void create()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
          Ghi nhận
        </button>
      </div>

      {/* Tra cứu + danh sách */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Lọc theo SĐT / STK / UID…"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        />
        <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-xs font-bold">
          <Search className="size-3.5" /> Lọc
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tải…
        </div>
      ) : reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Chưa có cảnh báo nào.
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`space-y-1.5 rounded-xl border bg-card p-3 ${
                r.revoked_at ? "border-border opacity-60" : SEVERITY_STYLE[r.severity]
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-black uppercase tracking-wider">{TYPE_LABEL[r.subject_type]}</span>
                <span className="font-mono font-bold text-foreground">{r.subject_value}</span>
                <span className="opacity-70">
                  {r.source === "dispute" ? "tranh chấp" : "thủ công"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </span>
                {r.revoked_at && (
                  <span className="rounded-full border border-border px-2 py-0.5 font-bold">ĐÃ GỠ</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{r.note}</p>
              {r.revoked_at ? (
                <p className="text-[11px] italic text-muted-foreground">Gỡ vì: {r.revoke_reason}</p>
              ) : (
                <button
                  onClick={() => void revoke(r.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                >
                  <Undo2 className="size-3" /> Gỡ cảnh báo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
