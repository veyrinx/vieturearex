"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, Swords, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/loading-spinner";

type Weapon = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string;
  damage: number | null;
  range: number | null;
  rate_of_fire: number | null;
  reload: number | null;
  magazine: number | null;
  released_at: string | null;
  updated_at?: string;
};

type Draft = Omit<Weapon, "updated_at">;

const emptyDraft = (): Draft => ({
  id: "",
  slug: "",
  name: "",
  description: "",
  image_url: "",
  damage: null,
  range: null,
  rate_of_fire: null,
  reload: null,
  magazine: null,
  released_at: "",
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const STAT_FIELDS: Array<{ key: keyof Draft; label: string }> = [
  { key: "damage", label: "Sát thương" },
  { key: "range", label: "Tầm bắn" },
  { key: "rate_of_fire", label: "Tốc độ bắn" },
  { key: "reload", label: "Tốc độ thay đạn" },
  { key: "magazine", label: "Băng đạn" },
];

export function WeaponsManager() {
  const [loading, setLoading] = useState(true);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/weapons");
      const json = await res.json().catch(() => ({}));
      setWeapons((json.weapons ?? []) as Weapon[]);
    } catch {
      toast.error("Không thể tải danh sách vũ khí.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  function num(v: string): number | null {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

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
    if (!draft.name.trim()) return toast.error("Nhập tên vũ khí.");
    if (!draft.slug.trim()) return toast.error("Nhập slug.");
    if (!draft.image_url.trim()) return toast.error("Cần có ảnh vũ khí.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/weapons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id || null,
          slug: draft.slug.trim(),
          name: draft.name.trim(),
          description: draft.description?.trim() || null,
          image_url: draft.image_url.trim(),
          damage: draft.damage,
          range: draft.range,
          rate_of_fire: draft.rate_of_fire,
          reload: draft.reload,
          magazine: draft.magazine,
          released_at: draft.released_at || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Lưu thất bại.");
      toast.success("Đã lưu vũ khí.");
      setDraft(null);
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(w: Weapon) {
    if (!confirm(`Xóa vũ khí "${w.name}"?`)) return;
    const res = await fetch(`/api/admin/weapons?id=${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xóa.");
      setWeapons((prev) => prev.filter((x) => x.id !== w.id));
    } else {
      const b = await res.json().catch(() => null);
      toast.error(b?.error ?? "Xóa thất bại.");
    }
  }

  if (loading) return <LoadingSpinner className="py-12" label="ĐANG TẢI..." />;

  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Swords className="size-4 text-primary" />
            <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">
              {draft.id ? "Sửa vũ khí" : "Vũ khí mới"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.image_url} alt="Vũ khí" className="size-full object-contain p-1" />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground">Chưa có ảnh</div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên vũ khí">
              <Input
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  update(draft.id ? { name } : { name, slug: slugify(name) });
                }}
                placeholder="MP40"
                className="bg-background"
              />
            </Field>
            <Field label="Slug (URL)">
              <Input value={draft.slug} onChange={(e) => update({ slug: slugify(e.target.value) })} placeholder="mp40" className="bg-background" />
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              placeholder="Giới thiệu ngắn về vũ khí..."
              className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            {STAT_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  value={(draft[key] as number | null) ?? ""}
                  onChange={(e) => update({ [key]: num(e.target.value) } as Partial<Draft>)}
                  placeholder="0"
                  className="bg-background"
                />
              </Field>
            ))}
            <Field label="Ngày ra mắt">
              <Input type="date" value={draft.released_at ?? ""} onChange={(e) => update({ released_at: e.target.value })} className="bg-background" />
            </Field>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1 gap-2 rounded-xl">
            <Save className="size-4" /> {saving ? "Đang lưu..." : "Lưu vũ khí"}
          </Button>
          <Button onClick={() => setDraft(null)} variant="outline" className="rounded-xl">Hủy</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setDraft(emptyDraft())} className="gap-2 rounded-xl">
        <Plus className="size-4" /> Thêm vũ khí
      </Button>

      {weapons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Chưa có vũ khí nào.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weapons.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                {w.image_url ? (
                  <Image src={w.image_url} alt={w.name} width={56} height={56} className="size-full object-contain p-1" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{w.name}</p>
                <p className="truncate text-xs text-muted-foreground">/{w.slug} · ST {w.damage ?? "—"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDraft({ ...emptyDraft(), ...w, description: w.description ?? "", released_at: w.released_at ?? "" })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Sửa">
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => remove(w)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Xóa">
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
