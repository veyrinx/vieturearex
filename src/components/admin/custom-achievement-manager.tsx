"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Sparkles, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import {
  ALL_RARITIES, ALL_CATEGORIES, RARITY_META, ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_METRICS, METRIC_LABEL,
  slugifyAchievementId,
  type AchievementDef, type AchievementRarity, type AchievementCategory, type AchievementMetric,
} from "@/lib/constants/achievements";
import { cn } from "@/lib/utils";

type FormState = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  points: number;
  hidden: boolean;
  autoMetric: "" | AchievementMetric;
  autoThreshold: number;
};

const EMPTY: FormState = {
  id: "", name: "", description: "", icon: "🏅",
  rarity: "common", category: "account", points: 0, hidden: false,
  autoMetric: "", autoThreshold: 0,
};

const AUTO_NONE = "none";

async function saveDefs(items: AchievementDef[]): Promise<AchievementDef[]> {
  const res = await fetch("/api/admin/achievements/defs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = (await res.json().catch(() => ({}))) as { items?: AchievementDef[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Không lưu được");
  return data.items ?? [];
}

export function CustomAchievementManager({
  defs,
  onChange,
}: {
  defs: AchievementDef[];
  onChange: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const startEdit = (d: AchievementDef) => {
    setEditingId(d.id);
    setForm({
      id: d.id, name: d.name, description: d.description, icon: d.icon,
      rarity: d.rarity, category: d.category, points: d.points, hidden: Boolean(d.hidden),
      autoMetric: d.auto?.metric ?? "", autoThreshold: d.auto?.threshold ?? 0,
    });
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) { toast.error("Nhập tên huy hiệu"); return; }
    const id = editingId ?? (form.id.trim() ? slugifyAchievementId(form.id) : slugifyAchievementId(name));
    if (!id) { toast.error("Không tạo được ID hợp lệ từ tên"); return; }
    if (!editingId && defs.some((d) => d.id === id)) {
      toast.error(`ID "${id}" đã tồn tại — đổi tên hoặc ID.`);
      return;
    }

    const auto =
      form.autoMetric && form.autoThreshold > 0
        ? { metric: form.autoMetric, threshold: Math.round(form.autoThreshold) }
        : undefined;

    const next: AchievementDef = {
      id, name,
      description: form.description.trim(),
      icon: form.icon.trim() || "🏅",
      rarity: form.rarity, category: form.category,
      points: Math.max(0, Math.min(1000, Math.round(form.points) || 0)),
      ...(form.hidden ? { hidden: true } : {}),
      ...(auto ? { auto } : {}),
      custom: true,
    };

    const list = editingId
      ? defs.map((d) => (d.id === editingId ? next : d))
      : [...defs, next];

    setSaving(true);
    try {
      await saveDefs(list);
      toast.success(editingId ? "Đã cập nhật huy hiệu" : "Đã tạo huy hiệu mới");
      reset();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await saveDefs(defs.filter((d) => d.id !== id));
      toast.success("Đã xoá loại huy hiệu");
      if (editingId === id) reset();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi xoá");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Sparkles className="size-4 text-violet-500" />
        </div>
        <h2 className="font-heading text-sm font-black uppercase tracking-wide">
          Loại Huy Hiệu Tuỳ Chỉnh ({defs.length})
        </h2>
      </div>

      {/* Form tạo / sửa */}
      <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Input
            value={form.icon}
            onChange={(e) => set("icon", e.target.value)}
            placeholder="🏅"
            className="w-16 text-center text-lg"
            maxLength={8}
          />
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Tên huy hiệu (vd: Nhà Tài Trợ)"
            className="flex-1"
            maxLength={80}
          />
        </div>
        <Input
          value={editingId ?? form.id}
          onChange={(e) => set("id", e.target.value)}
          placeholder="ID (tự tạo từ tên nếu bỏ trống)"
          className="font-mono text-xs"
          disabled={Boolean(editingId)}
          maxLength={40}
        />
        <Input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Mô tả ngắn"
          className="sm:col-span-2"
          maxLength={200}
        />
        <Select value={form.rarity} onValueChange={(v) => v && set("rarity", v as AchievementRarity)}>
          <SelectTrigger><SelectValue placeholder="Độ hiếm" /></SelectTrigger>
          <SelectContent>
            {ALL_RARITIES.map((r) => (
              <SelectItem key={r} value={r}>
                <span className={cn("text-xs font-bold", RARITY_META[r].color)}>{RARITY_META[r].label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={form.category} onValueChange={(v) => v && set("category", v as AchievementCategory)}>
          <SelectTrigger><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="text-xs">{ACHIEVEMENT_CATEGORIES[c].icon} {ACHIEVEMENT_CATEGORIES[c].label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={String(form.points)}
            onChange={(e) => set("points", Number(e.target.value))}
            placeholder="Điểm"
            className="w-24"
            min={0}
            max={1000}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.hidden} onChange={(e) => set("hidden", e.target.checked)} />
            Ẩn (chỉ hiện khi đạt)
          </label>
        </div>

        {/* Tự động trao */}
        <div className="flex items-center gap-2 sm:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Tự trao khi:</span>
          <Select
            value={form.autoMetric || AUTO_NONE}
            onValueChange={(v) => set("autoMetric", v === AUTO_NONE ? "" : (v as AchievementMetric))}
          >
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_NONE}><span className="text-xs">Không tự động (cấp tay)</span></SelectItem>
              {ACHIEVEMENT_METRICS.map((m) => (
                <SelectItem key={m} value={m}><span className="text-xs">{METRIC_LABEL[m]}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.autoMetric && (
            <>
              <span className="text-[11px] text-muted-foreground">≥</span>
              <Input
                type="number"
                value={String(form.autoThreshold)}
                onChange={(e) => set("autoThreshold", Number(e.target.value))}
                placeholder="Ngưỡng"
                className="w-28"
                min={1}
              />
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          {editingId && (
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
              <X className="size-4" /> Huỷ
            </Button>
          )}
          <Button onClick={() => void submit()} disabled={saving} size="sm" className="gap-1.5">
            {editingId ? <Save className="size-4" /> : <Plus className="size-4" />}
            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo huy hiệu"}
          </Button>
        </div>
      </div>

      {/* Danh sách custom defs */}
      {defs.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">Chưa có loại huy hiệu tuỳ chỉnh nào. Tạo cái đầu tiên ở trên.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {defs.map((d) => {
            const meta = RARITY_META[d.rarity];
            return (
              <div key={d.id} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5", meta.bg)}>
                <span className="text-xl leading-none">{d.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {d.name}
                    <span className={cn("ml-1.5 text-[9px] font-bold uppercase", meta.color)}>{meta.label}</span>
                    {d.hidden && <span className="ml-1 text-[9px] text-muted-foreground">· ẩn</span>}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {d.id} · {ACHIEVEMENT_CATEGORIES[d.category].label} · +{d.points}đ
                    {d.auto && ` · ⚡ ${METRIC_LABEL[d.auto.metric]} ≥ ${d.auto.threshold}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(d)}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title="Sửa"
                >
                  <Pencil className="size-3.5" />
                </button>
                <ConfirmDeleteDialog
                  itemName={`loại huy hiệu "${d.name}"`}
                  itemType="loại huy hiệu"
                  description="Người đã được cấp vẫn giữ, nhưng huy hiệu sẽ mất tên/icon nếu xoá định nghĩa."
                  onConfirm={() => remove(d.id)}
                  trigger={
                    <Button size="sm" variant="ghost" className="size-7 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
