"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import type { StreamItem, StreamStatus } from "@/lib/types/content";
import { buildThumbnailUrl } from "@/lib/utils/stream-utils";
import { cn } from "@/lib/utils";

async function fetchAdminStreams(): Promise<{ streams: StreamItem[]; categories: string[] }> {
  const res = await fetch("/api/admin/streams", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load streams.");
  return res.json() as Promise<{ streams: StreamItem[]; categories: string[] }>;
}

const statusLabel: Record<StreamStatus, string> = {
  live: "TRỰC TIẾP",
  upcoming: "SẮP DIỄN RA",
  ended: "ĐÃ KẾT THÚC",
};

const emptyForm = {
  title: "",
  youtube_url: "",
  thumbnail_url: "",
  scheduled_at: new Date().toISOString().slice(0, 16),
  status: "upcoming" as StreamStatus,
  category: "ESPORTS",
};

export function StreamsAdminPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["streams-admin"],
    queryFn: fetchAdminStreams,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const streams = data?.streams ?? [];
  const categories = data?.categories ?? ["ESPORTS"];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["streams-admin"] });

  useEffect(() => {
    const sync = async () => {
      await fetch("/api/streams/sync", { method: "POST" }).catch(() => null);
      refresh();
    };
    sync();
    const interval = setInterval(sync, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const onYoutubeUrlChange = (url: string) => {
    setForm((prev) => ({
      ...prev,
      youtube_url: url,
      thumbnail_url: prev.thumbnail_url || buildThumbnailUrl(url),
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.youtube_url.trim()) {
      toast.error("Vui lòng nhập tiêu đề và URL YouTube.");
      return;
    }
    setSaving(true);
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { ...form, id: editingId } : form;
    const res = await fetch("/api/admin/streams", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => null) as { error?: string } | null;
      toast.error(err?.error ?? "Không thể lưu stream.");
      return;
    }
    toast.success(editingId ? "Đã cập nhật stream." : "Đã thêm stream mới.");
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const onEdit = (stream: StreamItem) => {
    setEditingId(stream.id);
    setForm({
      title: stream.title,
      youtube_url: stream.youtube_url,
      thumbnail_url: stream.thumbnail_url,
      scheduled_at: stream.scheduled_at.slice(0, 16),
      status: stream.status,
      category: stream.category ?? categories[0] ?? "ESPORTS",
    });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Xóa stream này?")) return;
    setDeletingId(id);
    const res = await fetch("/api/admin/streams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    if (!res.ok) { toast.error("Không thể xóa stream."); return; }
    toast.success("Đã xóa stream.");
    refresh();
  };

  const addCategory = async () => {
    const cat = newCategory.trim().toUpperCase();
    if (!cat) return;
    setCatSaving(true);
    const res = await fetch("/api/admin/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", category: cat }),
    });
    setCatSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null) as { error?: string } | null; toast.error(d?.error ?? "Lỗi."); return; }
    toast.success("Đã thêm danh mục.");
    setNewCategory("");
    refresh();
  };

  const removeCategory = async (cat: string) => {
    setCatSaving(true);
    const res = await fetch("/api/admin/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", category: cat }),
    });
    setCatSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null) as { error?: string } | null; toast.error(d?.error ?? "Lỗi."); return; }
    toast.success("Đã xóa danh mục.");
    refresh();
  };

  return (
    <section className="space-y-5">
      {/* Category manager */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="font-heading text-base font-semibold uppercase tracking-[0.08em] text-foreground">DANH MỤC</h3>
        <div className="flex gap-2">
          <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Tên danh mục mới..." className="border-border bg-background text-foreground"
            onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <Button type="button" onClick={addCategory} disabled={catSaving} className="rounded-xl shrink-0">
            <Plus className="mr-2 size-4" />THÊM
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button key={cat} type="button" onClick={() => removeCategory(cat)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-primary hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition">
              {cat}<X className="size-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="mb-4 font-heading text-lg font-semibold uppercase tracking-[0.08em] text-foreground">
          {editingId ? "Chỉnh sửa stream" : "Thêm stream mới"}
        </h3>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">TIÊU ĐỀ</label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tên buổi phát trực tiếp" className="border-border bg-background text-foreground" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">URL YOUTUBE</label>
            <Input value={form.youtube_url} onChange={(e) => onYoutubeUrlChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="border-border bg-background text-foreground" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">URL ẢNH THUMBNAIL</label>
            <Input value={form.thumbnail_url} onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))} placeholder="Tự động từ YouTube nếu để trống" className="border-border bg-background text-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">THỜI GIAN DỰ KIẾN</label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="border-border bg-background text-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">DANH MỤC</label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v ?? p.category }))}>
              <SelectTrigger className="border-border bg-background text-foreground uppercase tracking-[0.08em]">
                {form.category}
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">TRẠNG THÁI</label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as StreamStatus }))}>
              <SelectTrigger className="border-border bg-background text-foreground uppercase tracking-[0.08em]">
                {statusLabel[form.status]}
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                <SelectItem value="upcoming">SẮP DIỄN RA</SelectItem>
                <SelectItem value="live">TRỰC TIẾP</SelectItem>
                <SelectItem value="ended">ĐÃ KẾT THÚC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? "ĐANG LƯU..." : editingId ? "CẬP NHẬT" : <><Plus className="mr-2 size-4" />THÊM STREAM</>}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl">HỦY</Button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI STREAMS..." />
      ) : streams.length === 0 ? (
        <EmptyState title="CHƯA CÓ STREAM" description="Thêm buổi phát trực tiếp đầu tiên." />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 uppercase tracking-[0.08em]">TIÊU ĐỀ</th>
                <th className="px-4 py-3 uppercase tracking-[0.08em]">DANH MỤC</th>
                <th className="px-4 py-3 uppercase tracking-[0.08em]">TRẠNG THÁI</th>
                <th className="px-4 py-3 uppercase tracking-[0.08em]">THỜI GIAN</th>
                <th className="px-4 py-3 uppercase tracking-[0.08em]"></th>
              </tr>
            </thead>
            <tbody>
              {streams.map((stream) => (
                <tr key={stream.id} className="border-t border-border text-foreground">
                  <td className="px-4 py-3 font-medium">{stream.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs uppercase">{stream.category}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase",
                      stream.status === "live" && "bg-[#FF0000]/15 text-[#FF0000]",
                      stream.status === "upcoming" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      stream.status === "ended" && "bg-muted text-muted-foreground",
                    )}>
                      {stream.status === "live" && <Radio className="size-3 animate-pulse" />}
                      {statusLabel[stream.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(stream.scheduled_at).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onEdit(stream)}><Edit2 className="size-3.5" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white" disabled={deletingId === stream.id} onClick={() => onDelete(stream.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
