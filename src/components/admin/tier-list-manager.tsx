"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, X, Search, ListChecks, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { FF_ITEM_IMAGE_BASE_URL } from "@/lib/constants/ff-items";
import { cn } from "@/lib/utils";

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];

const TIER_META: Record<Tier, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffff7f]",
  C: "bg-[#7fff7f]",
  D: "bg-[#7fbfff]",
};

type Entry = {
  ref_id: string | null;
  name: string;
  image_url: string;
  tier: Tier;
};

type TierList = {
  id: string;
  kind: "character" | "weapon";
  patch: string;
  title: string | null;
  updated_at: string;
  entries: Array<Entry & { id?: string; position?: number | null }>;
};

type CatalogItem = { id: string; label: string | null; category: string | null };

const imageOf = (id: string) => (FF_ITEM_IMAGE_BASE_URL ? `${FF_ITEM_IMAGE_BASE_URL}/${id}.png` : "");

type Draft = {
  id: string | null;
  kind: "character" | "weapon";
  patch: string;
  title: string;
  entries: Entry[];
};

const emptyDraft = (): Draft => ({ id: null, kind: "character", patch: "", title: "", entries: [] });

export function TierListManager() {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<TierList[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, catRes] = await Promise.all([
        fetch("/api/admin/tier-lists"),
        fetch("/api/admin/ff-items/catalog"),
      ]);
      const listJson = await listRes.json().catch(() => ({}));
      const catJson = await catRes.json().catch(() => ({}));
      setLists((listJson.lists ?? []) as TierList[]);
      setCatalog((catJson.items ?? []) as CatalogItem[]);
    } catch {
      toast.error("Không thể tải dữ liệu tier list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startNew() {
    setDraft(emptyDraft());
  }

  function startEdit(list: TierList) {
    setDraft({
      id: list.id,
      kind: list.kind,
      patch: list.patch,
      title: list.title ?? "",
      entries: list.entries.map((e) => ({
        ref_id: e.ref_id,
        name: e.name,
        image_url: e.image_url,
        tier: (TIERS.includes(e.tier as Tier) ? e.tier : "C") as Tier,
      })),
    });
  }

  async function remove(list: TierList) {
    if (!confirm(`Xóa tier list ${list.kind === "character" ? "nhân vật" : "vũ khí"} OB${list.patch}?`)) return;
    const res = await fetch(`/api/admin/tier-lists?id=${list.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xóa tier list.");
      setLists((prev) => prev.filter((l) => l.id !== list.id));
    } else {
      const b = await res.json().catch(() => null);
      toast.error(b?.error ?? "Xóa thất bại.");
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.patch.trim()) {
      toast.error("Nhập phiên bản OB (vd: 48).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          kind: draft.kind,
          patch: draft.patch.trim(),
          title: draft.title.trim() || null,
          entries: draft.entries.map((e, i) => ({ ...e, position: i })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Lưu thất bại.");
        return;
      }
      toast.success("Đã lưu tier list.");
      setDraft(null);
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner className="py-12" label="ĐANG TẢI..." />;

  if (draft) {
    return (
      <DraftEditor
        draft={draft}
        setDraft={setDraft}
        catalog={catalog}
        saving={saving}
        onSave={save}
        onCancel={() => setDraft(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={startNew} className="gap-2 rounded-xl">
        <Plus className="size-4" /> Tạo tier list mới
      </Button>

      {lists.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Chưa có tier list nào. Bấm &quot;Tạo tier list mới&quot; để bắt đầu.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {list.kind === "character" ? <Users className="size-4 text-primary" /> : <Swords className="size-4 text-primary" />}
                  <div>
                    <p className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                      {list.kind === "character" ? "Nhân Vật" : "Vũ Khí"} · OB{list.patch}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {list.entries.length} mục · {new Date(list.updated_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(list)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Sửa">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => remove(list)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Xóa">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {TIERS.map((t) => {
                  const n = list.entries.filter((e) => e.tier === t).length;
                  return (
                    <span key={t} className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-black text-background", TIER_META[t])}>
                      {t}<span className="font-semibold">{n}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftEditor({
  draft, setDraft, catalog, saving, onSave, onCancel,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>;
  catalog: CatalogItem[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [pickerTier, setPickerTier] = useState<Tier | null>(null);
  const [query, setQuery] = useState("");

  const usedIds = useMemo(() => new Set(draft.entries.map((e) => e.ref_id)), [draft.entries]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((c) => !usedIds.has(c.id))
      .filter((c) => !q || (c.label ?? c.id).toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 60);
  }, [catalog, query, usedIds]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  function addItem(item: CatalogItem, tier: Tier) {
    update({
      entries: [
        ...draft.entries,
        { ref_id: item.id, name: item.label || item.id, image_url: imageOf(item.id), tier },
      ],
    });
  }

  function addManual(tier: Tier) {
    const name = prompt("Tên mục (nhập thủ công):")?.trim();
    if (!name) return;
    const image_url = prompt("URL ảnh:")?.trim() ?? "";
    update({ entries: [...draft.entries, { ref_id: null, name, image_url, tier }] });
  }

  function removeEntry(idx: number) {
    update({ entries: draft.entries.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4">
      {/* meta */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">
            {draft.id ? "Sửa tier list" : "Tier list mới"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loại</label>
            <div className="flex gap-1">
              {(["character", "weapon"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => update({ kind: k })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                    draft.kind === k ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {k === "character" ? <Users className="size-3.5" /> : <Swords className="size-3.5" />}
                  {k === "character" ? "Nhân Vật" : "Vũ Khí"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phiên bản OB</label>
            <Input value={draft.patch} onChange={(e) => update({ patch: e.target.value })} placeholder="48" className="bg-background" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tiêu đề (tuỳ chọn)</label>
            <Input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Meta tháng 7" className="bg-background" />
          </div>
        </div>
      </div>

      {/* tiers */}
      <div className="space-y-2">
        {TIERS.map((tier) => {
          const items = draft.entries.map((e, i) => ({ e, i })).filter(({ e }) => e.tier === tier);
          return (
            <div key={tier} className="flex items-start gap-2 rounded-xl border border-border bg-card p-2">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-black text-background", TIER_META[tier])}>
                {tier}
              </div>
              <div className="flex min-h-10 flex-1 flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2">
                {items.map(({ e, i }) => (
                  <div key={i} className="group relative">
                    <div className="size-12 overflow-hidden rounded-md border border-border bg-background" title={e.name}>
                      {e.image_url ? (
                        <Image src={e.image_url} alt={e.name} width={48} height={48} className="size-full object-contain" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[9px] text-muted-foreground">{e.name.slice(0, 6)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeEntry(i)}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      title="Bỏ"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { setPickerTier(tier); setQuery(""); }}
                  className="flex size-12 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  title="Thêm mục"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving} className="flex-1 gap-2 rounded-xl">
          <Save className="size-4" /> {saving ? "Đang lưu..." : "Lưu tier list"}
        </Button>
        <Button onClick={onCancel} variant="outline" className="rounded-xl">Hủy</Button>
      </div>

      {/* picker */}
      {pickerTier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setPickerTier(null)}>
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <p className="text-sm font-bold text-foreground">
                Thêm vào hạng <span className={cn("rounded px-1.5 text-background", TIER_META[pickerTier])}>{pickerTier}</span>
              </p>
              <button onClick={() => setPickerTier(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="border-b border-border p-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2">
                <Search className="size-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc id..."
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
              </div>
              <button
                onClick={() => { addManual(pickerTier); setPickerTier(null); }}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                + Nhập thủ công (tên & URL ảnh)
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-5">
              {results.length === 0 ? (
                <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                  Không có mục phù hợp. Dùng &quot;Nhập thủ công&quot; ở trên.
                </p>
              ) : (
                results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item, pickerTier)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border p-1.5 hover:border-primary hover:bg-primary/5"
                    title={item.label || item.id}
                  >
                    <div className="size-12 overflow-hidden rounded-md bg-muted/40">
                      <Image src={imageOf(item.id)} alt={item.label || item.id} width={48} height={48} className="size-full object-contain" />
                    </div>
                    <span className="w-full truncate text-center text-[10px] text-muted-foreground">{item.label || item.id}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
