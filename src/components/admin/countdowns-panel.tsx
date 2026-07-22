"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { COUNTDOWN_TAGS, type FFCountdown } from "@/lib/constants/countdowns";

type Row = FFCountdown & { _rid: string };
const rid = () => Math.random().toString(36).slice(2);
const toRow = (i: FFCountdown): Row => ({ ...i, _rid: rid() });

/** ISO đã lưu → "YYYY-MM-DDTHH:mm" hiển thị theo giờ Việt Nam. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Locale sv-SE cho ra đúng dạng "YYYY-MM-DD HH:mm".
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d).replace(" ", "T");
}

/** Ô nhập (giờ VN) → ISO để lưu. */
function fromLocalInput(v: string): string {
  if (!v) return "";
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function CountdownsPanel({ initialItems, canEdit }: { initialItems: FFCountdown[]; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(initialItems.map(toRow));
  const [saving, setSaving] = useState(false);

  const patch = (rid: string, upd: Partial<FFCountdown>) =>
    setRows((prev) => prev.map((r) => (r._rid === rid ? { ...r, ...upd } : r)));

  const add = () => {
    // Mặc định 7 ngày tới cho tiện.
    const d = new Date(Date.now() + 7 * 86_400_000);
    setRows((prev) => [...prev, toRow({ id: rid(), label: "Mốc mới", date: d.toISOString(), tag: "Sự kiện", enabled: true })]);
  };

  const remove = (rid: string) => setRows((prev) => prev.filter((r) => r._rid !== rid));

  async function save() {
    // Chặn sớm: mốc thiếu ngày sẽ bị server loại, báo cho admin biết thay vì mất im lặng.
    const bad = rows.find((r) => !r.date || Number.isNaN(new Date(r.date).getTime()));
    if (bad) { toast.error(`Mốc "${bad.label}" chưa có thời gian hợp lệ.`); return; }

    setSaving(true);
    try {
      const items = rows.map(({ _rid, ...rest }) => rest);
      const res = await fetch("/api/admin/countdowns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Lưu thất bại."); return; }
      if (Array.isArray(json.items)) setRows(json.items.map(toRow));
      toast.success("Đã lưu mốc đếm ngược.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Đếm Ngược Sự Kiện</h1>
            <p className="text-xs text-muted-foreground">
              Mốc cập nhật OB, reset rank, sự kiện. Nhập theo giờ Việt Nam. {canEdit ? "Sửa rồi bấm Lưu." : "Bạn chỉ có quyền xem."}
            </p>
          </div>
        </div>
        <Link href="/dem-nguoc" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <ExternalLink className="size-3.5" /> Xem trang
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const past = !Number.isNaN(new Date(r.date).getTime()) && new Date(r.date).getTime() < Date.now();
          return (
            <div key={r._rid} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr,200px,150px]">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tên mốc</span>
                  <input value={r.label} disabled={!canEdit} onChange={(e) => patch(r._rid, { label: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Thời gian (giờ VN)</span>
                  <input type="datetime-local" value={toLocalInput(r.date)} disabled={!canEdit}
                    onChange={(e) => patch(r._rid, { date: fromLocalInput(e.target.value) })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nhãn</span>
                  <select value={r.tag ?? ""} disabled={!canEdit} onChange={(e) => patch(r._rid, { tag: e.target.value || undefined })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                    <option value="">— Không —</option>
                    {COUNTDOWN_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ghi chú</span>
                <input value={r.note ?? ""} disabled={!canEdit} onChange={(e) => patch(r._rid, { note: e.target.value })}
                  placeholder="vd: Bảo trì ~4 tiếng, không vào game được"
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <input type="checkbox" checked={r.enabled !== false} disabled={!canEdit} onChange={(e) => patch(r._rid, { enabled: e.target.checked })} />
                  Hiển thị
                </label>
                {past && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    Đã qua — trang công khai vẫn hiện &ldquo;Đã diễn ra&rdquo;
                  </span>
                )}
                {canEdit && (
                  <button onClick={() => remove(r._rid)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="size-3.5" /> Xóa
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <CalendarClock className="mx-auto mb-2 size-6 opacity-40" /> Chưa có mốc nào.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
            <Plus className="size-4" /> Thêm mốc
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
