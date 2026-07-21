"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Plus, Trash2, Save, Loader2, ExternalLink, Star, Crown, Gem } from "lucide-react";
import Link from "next/link";
import type { PrimeItem, PrimeItemType } from "@/lib/constants/store";

type Row = PrimeItem & { _rid: string };
const rid = () => Math.random().toString(36).slice(2);
const toRow = (i: PrimeItem): Row => ({ ...i, _rid: rid() });

export function PrimePanel({ initialItems, canEdit }: { initialItems: PrimeItem[]; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(initialItems.map(toRow));
  const [saving, setSaving] = useState(false);

  const patch = (rid: string, upd: Partial<PrimeItem>) =>
    setRows((prev) => prev.map((r) => (r._rid === rid ? { ...r, ...upd } : r)));

  const add = () =>
    setRows((prev) => [
      ...prev,
      toRow({ id: rid(), name: "Gói mới", type: "pack", price: 0, enabled: true }),
    ]);

  const remove = (rid: string) => setRows((prev) => prev.filter((r) => r._rid !== rid));

  async function save() {
    setSaving(true);
    try {
      const items = rows.map(({ _rid, perks, ...rest }) => ({
        ...rest,
        perks: (perks ?? []).filter((p) => p.trim()),
      }));
      const res = await fetch("/api/admin/prime", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Lưu thất bại."); return; }
      if (Array.isArray(json.items)) setRows(json.items.map(toRow));
      toast.success("Đã lưu Cửa hàng Prime.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Cửa Hàng Prime</h1>
            <p className="text-xs text-muted-foreground">Quản lý gói thành viên & gói thời hạn. {canEdit ? "Sửa rồi bấm Lưu." : "Bạn chỉ có quyền xem."}</p>
          </div>
        </div>
        <Link href="/cua-hang-prime" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <ExternalLink className="size-3.5" /> Xem trang
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r._rid} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr,130px,120px]">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tên gói</span>
                <input value={r.name} disabled={!canEdit} onChange={(e) => patch(r._rid, { name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loại</span>
                <select value={r.type} disabled={!canEdit} onChange={(e) => patch(r._rid, { type: e.target.value as PrimeItemType })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                  <option value="membership">Thành viên</option>
                  <option value="pack">Gói thời hạn</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Gem className="size-3 text-sky-400" /> Giá KC</span>
                <input type="number" value={r.price} disabled={!canEdit} onChange={(e) => patch(r._rid, { price: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Thời hạn / phụ đề</span>
                <input value={r.duration ?? ""} disabled={!canEdit} onChange={(e) => patch(r._rid, { duration: e.target.value })}
                  placeholder="vd: 30 ngày Prime"
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>
              {r.type === "membership" && (
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quyền lợi (mỗi dòng 1 mục)</span>
                  <textarea value={(r.perks ?? []).join("\n")} disabled={!canEdit} rows={3}
                    onChange={(e) => patch(r._rid, { perks: e.target.value.split("\n") })}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </label>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <input type="checkbox" checked={!!r.featured} disabled={!canEdit} onChange={(e) => patch(r._rid, { featured: e.target.checked })} />
                <Star className="size-3.5 text-amber-500" /> Nổi bật
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <input type="checkbox" checked={r.enabled !== false} disabled={!canEdit} onChange={(e) => patch(r._rid, { enabled: e.target.checked })} />
                Hiển thị
              </label>
              {canEdit && (
                <button onClick={() => remove(r._rid)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10">
                  <Trash2 className="size-3.5" /> Xóa
                </button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Crown className="mx-auto mb-2 size-6 opacity-40" /> Chưa có gói nào.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
            <Plus className="size-4" /> Thêm gói
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
