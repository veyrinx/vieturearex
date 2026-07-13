"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, Layers, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PLAYSTYLES, playstyleLabel } from "@/lib/constants/weapon-types";

type WeaponOption = { id: string; name: string };
type WeaponRef = { id: string; name: string; image_url: string } | null;

type Loadout = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  playstyle: string | null;
  position: number;
  primary_weapon_id: string | null;
  secondary_weapon_id: string | null;
  primary_weapon: WeaponRef;
  secondary_weapon: WeaponRef;
};

type Draft = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  playstyle: string | null;
  position: number;
  primary_weapon_id: string | null;
  secondary_weapon_id: string | null;
};

const NONE = "none";

const emptyDraft = (): Draft => ({
  id: "",
  slug: "",
  name: "",
  description: "",
  image_url: "",
  playstyle: null,
  position: 0,
  primary_weapon_id: null,
  secondary_weapon_id: null,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function LoadoutsManager() {
  const [loading, setLoading] = useState(true);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<WeaponOption[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [lRes, wRes] = await Promise.all([
        fetch("/api/admin/loadouts"),
        fetch("/api/admin/weapons"),
      ]);
      const lJson = await lRes.json().catch(() => ({}));
      const wJson = await wRes.json().catch(() => ({}));
      setLoadouts((lJson.loadouts ?? []) as Loadout[]);
      setWeapons(((wJson.weapons ?? []) as WeaponOption[]).map((w) => ({ id: w.id, name: w.name })));
    } catch {
      toast.error("Không thể tải danh sách combo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function onUpload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Chỉ hỗ trợ ảnh.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB.");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "gallery");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Tải ảnh thất bại.");
      update({ image_url: json.publicUrl });
      toast.success("Đã tải ảnh lên.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Nhập tên combo.");
    if (!draft.slug.trim()) return toast.error("Nhập slug.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/loadouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id || null,
          slug: draft.slug.trim(),
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          image_url: draft.image_url.trim() || null,
          playstyle: draft.playstyle || null,
          position: draft.position,
          primary_weapon_id: draft.primary_weapon_id || null,
          secondary_weapon_id: draft.secondary_weapon_id || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Lưu thất bại.");
      toast.success("Đã lưu combo.");
      setDraft(null);
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(l: Loadout) {
    if (!confirm(`Xóa combo "${l.name}"?`)) return;
    const res = await fetch(`/api/admin/loadouts?id=${l.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xóa.");
      setLoadouts((prev) => prev.filter((x) => x.id !== l.id));
    } else {
      const b = await res.json().catch(() => null);
      toast.error(b?.error ?? "Xóa thất bại.");
    }
  }

  if (loading) return <LoadingSpinner className="py-12" label="ĐANG TẢI..." />;

  if (draft) {
    return (
      <div className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">
              {draft.id ? "Sửa combo" : "Combo mới"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên combo">
              <Input
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  update(draft.id ? { name } : { name, slug: slugify(name) });
                }}
                placeholder="Combo rush cận chiến"
                className="bg-background"
              />
            </Field>
            <Field label="Slug (URL)">
              <Input value={draft.slug} onChange={(e) => update({ slug: slugify(e.target.value) })} placeholder="combo-rush" className="bg-background" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vũ khí chính">
              <Select value={draft.primary_weapon_id ?? NONE} onValueChange={(v) => update({ primary_weapon_id: v === NONE ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn vũ khí..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Không —</SelectItem>
                  {weapons.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vũ khí phụ">
              <Select value={draft.secondary_weapon_id ?? NONE} onValueChange={(v) => update({ secondary_weapon_id: v === NONE ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn vũ khí..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Không —</SelectItem>
                  {weapons.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Lối chơi">
              <Select value={draft.playstyle ?? NONE} onValueChange={(v) => update({ playstyle: v === NONE ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn lối chơi..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Không —</SelectItem>
                  {PLAYSTYLES.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Thứ tự hiển thị">
              <Input type="number" value={draft.position} onChange={(e) => update({ position: parseInt(e.target.value, 10) || 0 })} className="bg-background" />
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              placeholder="Giới thiệu ngắn về combo, cách dùng..."
              className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.image_url} alt="Combo" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground">Ảnh (tuỳ chọn)</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input value={draft.image_url} onChange={(e) => update({ image_url: e.target.value })} placeholder="Dán URL ảnh hoặc bấm tải lên..." className="bg-background" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5 rounded-lg text-xs">
                <ImagePlus size={14} /> {uploading ? "Đang tải..." : "Tải ảnh lên"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }} />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1 gap-2 rounded-xl">
            <Save className="size-4" /> {saving ? "Đang lưu..." : "Lưu combo"}
          </Button>
          <Button onClick={() => setDraft(null)} variant="outline" className="rounded-xl">Hủy</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setDraft(emptyDraft())} className="gap-2 rounded-xl">
        <Plus className="size-4" /> Thêm combo
      </Button>

      {loadouts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Chưa có combo nào.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {loadouts.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="flex -space-x-2">
                {[l.primary_weapon, l.secondary_weapon].filter(Boolean).map((w, i) => (
                  <div key={i} className="size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                    <Image src={w!.image_url} alt={w!.name} width={48} height={48} className="size-full object-contain p-1" />
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {playstyleLabel(l.playstyle) ?? "—"} · /{l.slug}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setDraft({
                    ...emptyDraft(),
                    id: l.id,
                    slug: l.slug,
                    name: l.name,
                    description: l.description ?? "",
                    image_url: l.image_url ?? "",
                    playstyle: l.playstyle,
                    position: l.position,
                    primary_weapon_id: l.primary_weapon_id,
                    secondary_weapon_id: l.secondary_weapon_id,
                  })}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  title="Sửa"
                >
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => remove(l)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Xóa">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
