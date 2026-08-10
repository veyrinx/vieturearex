"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2, Plus, Trash2, Save, Loader2, ExternalLink, Music2 } from "lucide-react";
import Link from "next/link";
import type { SocialVideo, SocialPlatform } from "@/lib/constants/social";

type Row = SocialVideo & { _rid: string };
const rid = () => Math.random().toString(36).slice(2);
const toRow = (i: SocialVideo): Row => ({ ...i, _rid: rid() });

export function SocialPanel({ initialItems, canEdit }: { initialItems: SocialVideo[]; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(initialItems.map(toRow));
  const [saving, setSaving] = useState(false);

  const patch = (rid: string, upd: Partial<SocialVideo>) =>
    setRows((prev) => prev.map((r) => (r._rid === rid ? { ...r, ...upd } : r)));
  const add = () => setRows((prev) => [...prev, toRow({ id: rid(), title: "", url: "", platform: "tiktok", enabled: true })]);
  const remove = (rid: string) => setRows((prev) => prev.filter((r) => r._rid !== rid));

  async function save() {
    setSaving(true);
    try {
      const items = rows.map(({ _rid, ...rest }) => rest);
      const res = await fetch("/api/admin/social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Lưu thất bại."); return; }
      if (Array.isArray(json.items)) setRows(json.items.map(toRow));
      toast.success("Đã lưu video MXH.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <Share2 className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Mạng Xã Hội</h1>
            <p className="text-xs text-muted-foreground">Video TikTok/YouTube hiển thị ở trang /tiktok. {canEdit ? "Sửa rồi bấm Lưu." : "Chỉ xem."}</p>
          </div>
        </div>
        <Link href="/tiktok" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <ExternalLink className="size-3.5" /> Xem trang
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r._rid} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tiêu đề</span>
                <input value={r.title} disabled={!canEdit} onChange={(e) => patch(r._rid, { title: e.target.value })}
                  placeholder="vd: Highlight rank Đại Cao Thủ"
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nền tảng</span>
                <select value={r.platform} disabled={!canEdit} onChange={(e) => patch(r._rid, { platform: e.target.value as SocialPlatform })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Link video</span>
              <input value={r.url} disabled={!canEdit} onChange={(e) => patch(r._rid, { url: e.target.value })}
                placeholder="https://www.tiktok.com/@.../video/..."
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ảnh thumbnail (tuỳ chọn)</span>
              <input value={r.thumbnail ?? ""} disabled={!canEdit} onChange={(e) => patch(r._rid, { thumbnail: e.target.value })}
                placeholder="https://..."
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <input type="checkbox" checked={r.enabled !== false} disabled={!canEdit} onChange={(e) => patch(r._rid, { enabled: e.target.checked })} /> Hiển thị
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
            <Music2 className="mx-auto mb-2 size-6 opacity-40" /> Chưa có video nào.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
            <Plus className="size-4" /> Thêm video
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
