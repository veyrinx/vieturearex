"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ToggleRight, ToggleLeft, Megaphone, X, Pencil, Save, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

const TYPE_CLS: Record<string, string> = {
  info:    "border-blue-400/30 bg-blue-400/10 text-blue-500",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-500",
  success: "border-green-400/30 bg-green-400/10 text-green-600",
  error:   "border-red-400/30 bg-red-400/10 text-red-500",
};

const TYPE_LABELS: Record<string, string> = {
  info: "Thông tin", warning: "Cảnh báo", success: "Thành công", error: "Lỗi",
};

const EMPTY_FORM = { title: "", message: "", type: "info", starts_at: "", ends_at: "" };

function AnnouncementForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (form: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Tiêu đề *" value={form.title} onChange={set("title")} className="h-9 text-sm sm:col-span-2" />
        <textarea
          placeholder="Nội dung thông báo *"
          value={form.message}
          onChange={set("message")}
          rows={3}
          className="sm:col-span-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Loại thông báo</label>
          <select value={form.type} onChange={set("type")} className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm">
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kết thúc (tuỳ chọn)</label>
          <Input type="datetime-local" value={form.ends_at} onChange={set("ends_at")} className="h-9 text-sm" />
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-1">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Eye className="size-3" /> Preview
        </p>
        <div className={cn("rounded-xl border p-3", TYPE_CLS[form.type])}>
          <p className="text-xs font-bold">{form.title || "Tiêu đề thông báo"}</p>
          <p className="text-xs opacity-80 mt-0.5">{form.message || "Nội dung thông báo sẽ hiện ở đây"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={saving} className="rounded-xl gap-1.5">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="rounded-xl">Hủy</Button>
      </div>
    </div>
  );
}

export function BroadcastPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () => {
    void fetch("/api/admin/broadcast")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const create = async (form: typeof EMPTY_FORM) => {
    if (!form.title || !form.message) { toast.error("Điền đủ tiêu đề và nội dung"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, message: form.message, type: form.type, is_active: true, starts_at: form.starts_at || undefined, ends_at: form.ends_at || null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Đã tạo thông báo"); setShowNew(false); reload(); }
    else toast.error("Không thể tạo thông báo");
  };

  const update = async (id: string, form: typeof EMPTY_FORM) => {
    if (!form.title || !form.message) { toast.error("Điền đủ tiêu đề và nội dung"); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/broadcast/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, message: form.message, type: form.type, ends_at: form.ends_at || null }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Đã cập nhật thông báo");
      setEditingId(null);
      reload();
    } else toast.error("Không thể cập nhật");
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/admin/broadcast/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
      toast.success(current ? "Đã tắt thông báo" : "Đã kích hoạt thông báo");
    } else toast.error("Không thể cập nhật");
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE" });
    if (res.ok) { setAnnouncements((prev) => prev.filter((a) => a.id !== id)); toast.success("Đã xóa"); }
    else toast.error("Không thể xóa");
  };

  const activeCount = announcements.filter((a) => a.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="size-5 text-primary dark:text-amber-400" /> Thông Báo Hệ Thống
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-semibold text-green-500">{activeCount} đang hoạt động</span>
            {" · "}{announcements.length} tổng — Banner hiện trên trang web cho tất cả người dùng
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowNew(true); setEditingId(null); }} className="gap-1.5 rounded-xl shrink-0">
          <Plus className="size-3.5" /> Thêm mới
        </Button>
      </div>

      {/* Create form */}
      {showNew && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Plus className="size-3.5" /> Thông báo mới
            </p>
            <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <AnnouncementForm
            initial={EMPTY_FORM}
            onSave={create}
            onCancel={() => setShowNew(false)}
            saving={saving}
          />
        </div>
      )}

      {/* List */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Megaphone className="mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Chưa có thông báo nào</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Bấm &quot;Thêm mới&quot; để tạo thông báo đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={cn(
              "rounded-2xl border p-4 transition-all",
              a.is_active ? "border-border bg-card" : "border-border/40 bg-card/40 opacity-60",
            )}>
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-500 flex items-center gap-1.5">
                      <Pencil className="size-3.5" /> Chỉnh sửa thông báo
                    </p>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </div>
                  <AnnouncementForm
                    initial={{ title: a.title, message: a.message, type: a.type, starts_at: a.starts_at, ends_at: a.ends_at ?? "" }}
                    onSave={(form) => update(a.id, form)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", TYPE_CLS[a.type])}>
                        {TYPE_LABELS[a.type]}
                      </span>
                      {a.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">
                          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Đang hiện
                        </span>
                      )}
                      {a.ends_at && new Date(a.ends_at) < new Date() && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">Hết hạn</span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>
                    <div className={cn("rounded-lg border p-2.5 mt-2", TYPE_CLS[a.type])}>
                      <p className="text-[10px] font-bold">{a.title}</p>
                      <p className="text-[10px] opacity-80">{a.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      Tạo bởi {a.created_by ?? "Admin"} · {new Date(a.created_at).toLocaleDateString("vi-VN")}
                      {a.ends_at && ` · Hết hạn: ${new Date(a.ends_at).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(a.id); setShowNew(false); }}
                      title="Chỉnh sửa"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => void toggleActive(a.id, a.is_active)} title={a.is_active ? "Tắt" : "Bật"}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
                      {a.is_active
                        ? <ToggleRight className="size-6 text-green-500" />
                        : <ToggleLeft className="size-6 text-muted-foreground/50" />}
                    </button>
                    <ConfirmDeleteDialog
                      itemName={a.title}
                      itemType="thông báo"
                      description="Thông báo sẽ biến mất khỏi trang web ngay lập tức."
                      onConfirm={() => deleteItem(a.id)}
                      trigger={
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
