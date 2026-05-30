"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { cn } from "@/lib/utils";

type Frame = {
  id: string;
  name: string;
  css_ring: string;
  description: string | null;
  rarity: string;
  sort_order: number;
  is_active: boolean;
};

type Title = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  rarity: string;
  requirement: string | null;
  sort_order: number;
  is_active: boolean;
};

const RARITY_CLS: Record<string, string> = {
  common:    "border-border bg-muted text-muted-foreground",
  rare:      "border-blue-400/40 bg-blue-400/10 text-blue-500",
  epic:      "border-amber-400/40 bg-amber-400/10 text-amber-500",
  legendary: "border-purple-400/40 bg-purple-400/10 text-purple-500",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Thường", rare: "Hiếm", epic: "Sử thi", legendary: "Huyền thoại",
};

type Tab = "frames" | "titles";

type FrameFormState = Omit<Frame, "id" | "is_active">;
type TitleFormState = Omit<Title, "id" | "is_active">;

const EMPTY_FRAME: FrameFormState = { name: "", css_ring: "", description: "", rarity: "common", sort_order: 0 };
const EMPTY_TITLE: TitleFormState = { name: "", color: "#6366f1", description: "", rarity: "common", requirement: "", sort_order: 0 };

export function CosmeticsManager() {
  const [tab, setTab] = useState<Tab>("frames");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editFrame, setEditFrame] = useState<Frame | null>(null);
  const [editTitle, setEditTitle] = useState<Title | null>(null);
  const [showNewFrame, setShowNewFrame] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [newFrame, setNewFrame] = useState<FrameFormState>(EMPTY_FRAME);
  const [newTitle, setNewTitle] = useState<TitleFormState>(EMPTY_TITLE);

  const reload = () => {
    void fetch("/api/admin/cosmetics")
      .then((r) => r.json())
      .then((d) => { setFrames(d.frames ?? []); setTitles(d.titles ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const toggleActive = async (type: "frame" | "title", id: string, current: boolean) => {
    const res = await fetch("/api/admin/cosmetics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, is_active: !current }),
    });
    if (res.ok) {
      if (type === "frame") setFrames((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f));
      else setTitles((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !current } : t));
      toast.success(current ? "Đã ẩn" : "Đã kích hoạt");
    } else toast.error("Không thể cập nhật");
  };

  const deleteItem = async (type: "frame" | "title", id: string) => {
    const res = await fetch("/api/admin/cosmetics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    if (res.ok) {
      if (type === "frame") setFrames((prev) => prev.filter((f) => f.id !== id));
      else setTitles((prev) => prev.filter((t) => t.id !== id));
      toast.success("Đã xóa");
    } else toast.error("Không thể xóa");
  };

  const saveNewFrame = async () => {
    if (!newFrame.name || !newFrame.css_ring) { toast.error("Điền đủ tên và CSS ring"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/cosmetics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "frame", ...newFrame }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Đã tạo khung avatar"); setShowNewFrame(false); setNewFrame(EMPTY_FRAME); reload(); }
    else toast.error("Không thể tạo");
  };

  const saveNewTitle = async () => {
    if (!newTitle.name || !newTitle.color) { toast.error("Điền đủ tên và màu"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/cosmetics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "title", ...newTitle }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Đã tạo danh hiệu"); setShowNewTitle(false); setNewTitle(EMPTY_TITLE); reload(); }
    else toast.error("Không thể tạo");
  };

  const saveEditFrame = async () => {
    if (!editFrame) return;
    setSaving(true);
    const res = await fetch("/api/admin/cosmetics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "frame", id: editFrame.id, name: editFrame.name, css_ring: editFrame.css_ring, description: editFrame.description, rarity: editFrame.rarity, sort_order: editFrame.sort_order }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Đã cập nhật"); setEditFrame(null); reload(); }
    else toast.error("Không thể cập nhật");
  };

  const saveEditTitle = async () => {
    if (!editTitle) return;
    setSaving(true);
    const res = await fetch("/api/admin/cosmetics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "title", id: editTitle.id, name: editTitle.name, color: editTitle.color, description: editTitle.description, rarity: editTitle.rarity, requirement: editTitle.requirement, sort_order: editTitle.sort_order }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Đã cập nhật"); setEditTitle(null); reload(); }
    else toast.error("Không thể cập nhật");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Cosmetics Manager</h1>
          <p className="text-sm text-muted-foreground">Quản lý khung avatar và danh hiệu người dùng</p>
        </div>
        <Button
          size="sm"
          onClick={() => tab === "frames" ? setShowNewFrame(true) : setShowNewTitle(true)}
          className="gap-1.5 rounded-xl"
        >
          <Plus className="size-3.5" />
          {tab === "frames" ? "Thêm khung" : "Thêm danh hiệu"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {(["frames", "titles"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all",
              tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "frames" ? `Khung Avatar (${frames.length})` : `Danh Hiệu (${titles.length})`}
          </button>
        ))}
      </div>

      {/* Frames tab */}
      {tab === "frames" && (
        <div className="space-y-3">
          {showNewFrame && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Khung avatar mới</p>
                <button onClick={() => { setShowNewFrame(false); setNewFrame(EMPTY_FRAME); }}><X className="size-4 text-muted-foreground" /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Tên khung *" value={newFrame.name} onChange={(e) => setNewFrame((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />
                <select value={newFrame.rarity} onChange={(e) => setNewFrame((p) => ({ ...p, rarity: e.target.value }))} className="h-9 rounded-xl border border-border bg-background px-3 text-sm">
                  {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input placeholder="CSS Ring * (VD: ring-2 ring-blue-500)" value={newFrame.css_ring} onChange={(e) => setNewFrame((p) => ({ ...p, css_ring: e.target.value }))} className="h-9 text-sm sm:col-span-2" />
                <Input placeholder="Mô tả" value={newFrame.description ?? ""} onChange={(e) => setNewFrame((p) => ({ ...p, description: e.target.value }))} className="h-9 text-sm" />
                <Input type="number" placeholder="Thứ tự" value={newFrame.sort_order} onChange={(e) => setNewFrame((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <Button size="sm" onClick={saveNewFrame} disabled={saving} className="rounded-xl gap-1.5">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Tạo khung
              </Button>
            </div>
          )}

          {editFrame && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-500">Chỉnh sửa khung</p>
                <button onClick={() => setEditFrame(null)}><X className="size-4 text-muted-foreground" /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Tên khung *" value={editFrame.name} onChange={(e) => setEditFrame((p) => p ? { ...p, name: e.target.value } : p)} className="h-9 text-sm" />
                <select value={editFrame.rarity} onChange={(e) => setEditFrame((p) => p ? { ...p, rarity: e.target.value } : p)} className="h-9 rounded-xl border border-border bg-background px-3 text-sm">
                  {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input placeholder="CSS Ring *" value={editFrame.css_ring} onChange={(e) => setEditFrame((p) => p ? { ...p, css_ring: e.target.value } : p)} className="h-9 text-sm sm:col-span-2" />
                <Input placeholder="Mô tả" value={editFrame.description ?? ""} onChange={(e) => setEditFrame((p) => p ? { ...p, description: e.target.value } : p)} className="h-9 text-sm" />
                <Input type="number" placeholder="Thứ tự" value={editFrame.sort_order} onChange={(e) => setEditFrame((p) => p ? { ...p, sort_order: Number(e.target.value) } : p)} className="h-9 text-sm" />
              </div>
              <Button size="sm" onClick={saveEditFrame} disabled={saving} className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Lưu thay đổi
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Tên khung</th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">Rarity</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {frames.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{f.css_ring.slice(0, 40)}{f.css_ring.length > 40 ? "…" : ""}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", RARITY_CLS[f.rarity])}>
                        {RARITY_LABELS[f.rarity]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => void toggleActive("frame", f.id, f.is_active)} className="text-muted-foreground hover:text-foreground">
                        {f.is_active
                          ? <ToggleRight className="size-5 text-green-500" />
                          : <ToggleLeft className="size-5 text-muted-foreground/50" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditFrame(f)} className="size-8 text-muted-foreground hover:text-amber-500">
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={f.name}
                          itemType="khung avatar"
                          description="Sẽ không thể khôi phục khung này."
                          onConfirm={() => deleteItem("frame", f.id)}
                          trigger={
                            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Titles tab */}
      {tab === "titles" && (
        <div className="space-y-3">
          {showNewTitle && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Danh hiệu mới</p>
                <button onClick={() => { setShowNewTitle(false); setNewTitle(EMPTY_TITLE); }}><X className="size-4 text-muted-foreground" /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Tên danh hiệu *" value={newTitle.name} onChange={(e) => setNewTitle((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />
                <select value={newTitle.rarity} onChange={(e) => setNewTitle((p) => ({ ...p, rarity: e.target.value }))} className="h-9 rounded-xl border border-border bg-background px-3 text-sm">
                  {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="color" value={newTitle.color} onChange={(e) => setNewTitle((p) => ({ ...p, color: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1" />
                  <Input placeholder="#Màu sắc *" value={newTitle.color} onChange={(e) => setNewTitle((p) => ({ ...p, color: e.target.value }))} className="h-9 flex-1 text-sm" />
                </div>
                <Input placeholder="Điều kiện nhận" value={newTitle.requirement ?? ""} onChange={(e) => setNewTitle((p) => ({ ...p, requirement: e.target.value }))} className="h-9 text-sm" />
                <Input placeholder="Mô tả" value={newTitle.description ?? ""} onChange={(e) => setNewTitle((p) => ({ ...p, description: e.target.value }))} className="h-9 text-sm" />
                <Input type="number" placeholder="Thứ tự" value={newTitle.sort_order} onChange={(e) => setNewTitle((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <Button size="sm" onClick={saveNewTitle} disabled={saving} className="rounded-xl gap-1.5">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Tạo danh hiệu
              </Button>
            </div>
          )}

          {editTitle && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-500">Chỉnh sửa danh hiệu</p>
                <button onClick={() => setEditTitle(null)}><X className="size-4 text-muted-foreground" /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Tên *" value={editTitle.name} onChange={(e) => setEditTitle((p) => p ? { ...p, name: e.target.value } : p)} className="h-9 text-sm" />
                <select value={editTitle.rarity} onChange={(e) => setEditTitle((p) => p ? { ...p, rarity: e.target.value } : p)} className="h-9 rounded-xl border border-border bg-background px-3 text-sm">
                  {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="color" value={editTitle.color} onChange={(e) => setEditTitle((p) => p ? { ...p, color: e.target.value } : p)} className="h-9 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1" />
                  <Input placeholder="#Màu *" value={editTitle.color} onChange={(e) => setEditTitle((p) => p ? { ...p, color: e.target.value } : p)} className="h-9 flex-1 text-sm" />
                </div>
                <Input placeholder="Điều kiện" value={editTitle.requirement ?? ""} onChange={(e) => setEditTitle((p) => p ? { ...p, requirement: e.target.value } : p)} className="h-9 text-sm" />
                <Input placeholder="Mô tả" value={editTitle.description ?? ""} onChange={(e) => setEditTitle((p) => p ? { ...p, description: e.target.value } : p)} className="h-9 text-sm" />
                <Input type="number" placeholder="Thứ tự" value={editTitle.sort_order} onChange={(e) => setEditTitle((p) => p ? { ...p, sort_order: Number(e.target.value) } : p)} className="h-9 text-sm" />
              </div>
              <Button size="sm" onClick={saveEditTitle} disabled={saving} className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Lưu thay đổi
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Danh hiệu</th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">Rarity</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {titles.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold" style={{ color: t.color }}>{t.name}</p>
                      {t.description && <p className="text-[10px] text-muted-foreground">{t.description}</p>}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", RARITY_CLS[t.rarity])}>
                        {RARITY_LABELS[t.rarity]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => void toggleActive("title", t.id, t.is_active)} className="text-muted-foreground hover:text-foreground">
                        {t.is_active
                          ? <ToggleRight className="size-5 text-green-500" />
                          : <ToggleLeft className="size-5 text-muted-foreground/50" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditTitle(t)} className="size-8 text-muted-foreground hover:text-amber-500">
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={t.name}
                          itemType="danh hiệu"
                          description="Sẽ không thể khôi phục danh hiệu này."
                          onConfirm={() => deleteItem("title", t.id)}
                          trigger={
                            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
