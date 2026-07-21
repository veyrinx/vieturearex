"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import {
  LOCK_STATUSES,
  LOCK_LABELS,
  type FeatureLock,
  type FeatureLockStatus,
} from "@/lib/constants/feature-locks";

// Gợi ý route hay khóa (hiện trong datalist)
const ROUTE_SUGGESTIONS = [
  "/dinh-gia-nick", "/tinh-nap", "/tinh-kd", "/do-nhay", "/combo", "/tier-list",
  "/items", "/tao-ten", "/dem-nguoc", "/trang-thai", "/bxh-nick-vn", "/cong-cu",
  "/vu-khi", "/nhan-vat", "/tournaments",
];

type Row = FeatureLock & { _id: string };

const uid = () => Math.random().toString(36).slice(2);

export function FeatureLocksPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/feature-locks")
      .then((r) => (r.ok ? r.json() : { locks: [] }))
      .then((d) => setRows((d.locks ?? []).map((l: FeatureLock) => ({ ...l, _id: uid() }))))
      .catch(() => toast.error("Không tải được danh sách."))
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [...rs, { _id: uid(), path: "", status: "maintenance" }]);

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r._id !== id));

  async function save() {
    const locks = rows
      .map((r) => ({
        path: r.path.trim(),
        status: r.status ?? "maintenance",
        title: r.title?.trim() || undefined,
        message: r.message?.trim() || undefined,
        until: r.until?.trim() || undefined,
      }))
      .filter((r) => r.path.startsWith("/"));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/feature-locks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locks }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Lưu thất bại.");
      setRows((json.locks ?? []).map((l: FeatureLock) => ({ ...l, _id: uid() })));
      toast.success("Đã lưu. Có hiệu lực trong ~30 giây.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-black text-foreground">
            <Lock className="size-6 text-amber-500" /> Khóa chức năng
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Khóa hoặc đánh dấu “đang cập nhật” cho từng route. Người dùng thường sẽ thấy trang
            <b> /dang-cap-nhat</b>; <b>admin vẫn vào xem được</b>. Không ảnh hưởng phần còn lại của web.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu thay đổi
        </button>
      </div>

      <datalist id="route-suggestions">
        {ROUTE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
      </datalist>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tải…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Chưa khóa chức năng nào. Bấm “Thêm route” để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r._id} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Route</label>
                  <input
                    list="route-suggestions"
                    value={r.path}
                    onChange={(e) => update(r._id, { path: e.target.value })}
                    placeholder="/dinh-gia-nick"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Trạng thái</label>
                  <select
                    value={r.status ?? "maintenance"}
                    onChange={(e) => update(r._id, { status: e.target.value as FeatureLockStatus })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {LOCK_STATUSES.map((s) => <option key={s} value={s}>{LOCK_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-1.5">
                  <a
                    href={r.path || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                    title="Mở thử (admin xem được)"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                  <button
                    onClick={() => removeRow(r._id)}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-rose-500 transition-colors hover:bg-rose-500/10"
                    title="Xóa"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_150px]">
                <input
                  value={r.title ?? ""}
                  onChange={(e) => update(r._id, { title: e.target.value })}
                  placeholder="Tiêu đề (tùy chọn)"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  value={r.message ?? ""}
                  onChange={(e) => update(r._id, { message: e.target.value })}
                  placeholder="Thông báo cho người dùng (tùy chọn)"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  value={r.until ?? ""}
                  onChange={(e) => update(r._id, { until: e.target.value })}
                  placeholder="Mở lại: 20/07/2026"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addRow}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        <Plus className="size-4" /> Thêm route
      </button>
    </div>
  );
}
