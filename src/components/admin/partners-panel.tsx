"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Handshake, Plus, Trash2, Save, Loader2, ExternalLink, Star,
  ChevronDown, ChevronRight, X, CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import {
  PARTNER_TIERS, TIER_LABEL, isPartnerLive, todayInVietnam,
  type Partner, type PartnerTier, type PartnerSocials,
} from "@/lib/constants/partners";
import { cn } from "@/lib/utils";

type Row = Partner & { _rid: string };
const rid = () => Math.random().toString(36).slice(2);
const toRow = (i: Partner): Row => ({ ...i, _rid: rid() });

const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

/** Ô logo: xem trước + tải lên + dán link, dùng cho cả logo trái và phải. */
function LogoField({
  label, value, disabled, onChange,
}: {
  label: string;
  value?: string;
  disabled: boolean;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <Handshake className="size-4 text-muted-foreground/40" />
          )}
        </div>
        <input
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="https://... hoặc bấm Tải lên"
          className={INPUT}
        />
        {!disabled && (
          <ImageUploadButton
            endpoint="/api/admin/upload"
            bucket="logos"
            label="Tải lên"
            onUploaded={(url) => onChange(url)}
          />
        )}
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Bỏ logo"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-rose-500"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PartnersPanel({ initialItems, canEdit }: { initialItems: Partner[]; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(initialItems.map(toRow));
  const [saving, setSaving] = useState(false);
  const [openSocials, setOpenSocials] = useState<Record<string, boolean>>({});
  const today = todayInVietnam();

  const patch = (rid: string, upd: Partial<Partner>) =>
    setRows((prev) => prev.map((r) => (r._rid === rid ? { ...r, ...upd } : r)));

  const patchSocial = (row: Row, key: string, value: string) => {
    const next: PartnerSocials = { ...(row.socials ?? {}) };
    if (value.trim()) next[key as keyof PartnerSocials] = value.trim();
    else delete next[key as keyof PartnerSocials];
    patch(row._rid, { socials: next });
  };

  const add = () =>
    setRows((prev) => [...prev, toRow({ id: rid(), name: "Đối tác mới", tier: "community", enabled: true })]);

  const remove = (rid: string) => setRows((prev) => prev.filter((r) => r._rid !== rid));

  async function save() {
    setSaving(true);
    try {
      const items = rows.map(({ _rid, ...rest }) => rest);
      const res = await fetch("/api/admin/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Lưu thất bại."); return; }
      if (Array.isArray(json.items)) setRows(json.items.map(toRow));
      toast.success("Đã lưu danh sách đối tác.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <Handshake className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Hợp Tác</h1>
            <p className="text-xs text-muted-foreground">
              Quản lý nhà tài trợ, đối tác truyền thông & cộng đồng đồng hành. {canEdit ? "Sửa rồi bấm Lưu." : "Bạn chỉ có quyền xem."}
            </p>
          </div>
        </div>
        <Link href="/partnership" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <ExternalLink className="size-3.5" /> Xem trang
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const live = isPartnerLive(r, today);
          const expired = !!r.endsAt && r.endsAt < today;
          const socialCount = Object.keys(r.socials ?? {}).length;
          return (
            <div key={r._rid} className={cn("rounded-2xl border bg-card p-4", live ? "border-border" : "border-dashed border-border opacity-75")}>
              <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
                <label className="space-y-1">
                  <span className={LABEL}>Tên đối tác</span>
                  <input value={r.name} disabled={!canEdit} onChange={(e) => patch(r._rid, { name: e.target.value })} className={INPUT} />
                </label>
                <label className="space-y-1">
                  <span className={LABEL}>Loại</span>
                  <select value={r.tier} disabled={!canEdit} onChange={(e) => patch(r._rid, { tier: e.target.value as PartnerTier })}
                    className={cn(INPUT, "px-2")}>
                    {PARTNER_TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                  </select>
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className={LABEL}>Mô tả ngắn</span>
                <textarea value={r.desc ?? ""} disabled={!canEdit} rows={2}
                  onChange={(e) => patch(r._rid, { desc: e.target.value })}
                  placeholder="Giới thiệu ngắn về đối tác..."
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              </label>

              <div className="mt-3 space-y-3">
                <LogoField label="Logo bên trái tên" value={r.logo} disabled={!canEdit}
                  onChange={(v) => patch(r._rid, { logo: v })} />
                <LogoField label="Logo bên phải tên" value={r.logoRight} disabled={!canEdit}
                  onChange={(v) => patch(r._rid, { logoRight: v })} />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className={LABEL}>Link chính (website / fanpage)</span>
                  <input value={r.url ?? ""} disabled={!canEdit} onChange={(e) => patch(r._rid, { url: e.target.value })}
                    placeholder="https://..." className={INPUT} />
                </label>
                <label className="space-y-1">
                  <span className={LABEL}>Ngày hết hợp tác (tự ẩn)</span>
                  <input type="date" value={r.endsAt ?? ""} disabled={!canEdit}
                    onChange={(e) => patch(r._rid, { endsAt: e.target.value || undefined })} className={INPUT} />
                </label>
              </div>

              {/* Mạng xã hội — gấp lại cho gọn, mở ra khi cần sửa. */}
              <div className="mt-3 rounded-xl border border-border/70">
                <button type="button"
                  onClick={() => setOpenSocials((p) => ({ ...p, [r._rid]: !p[r._rid] }))}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                  {openSocials[r._rid] ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  Mạng xã hội
                  {socialCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary dark:text-amber-400">
                      {socialCount}
                    </span>
                  )}
                </button>
                {openSocials[r._rid] && (
                  <div className="grid gap-2 border-t border-border/70 p-3 sm:grid-cols-2">
                    {SOCIAL_DEFS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <label key={s.key} className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <input
                            value={r.socials?.[s.key] ?? ""}
                            disabled={!canEdit}
                            onChange={(e) => patchSocial(r, s.key, e.target.value)}
                            placeholder={s.placeholder}
                            className={INPUT}
                          />
                        </label>
                      );
                    })}
                  </div>
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
                {expired && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500">
                    <CalendarClock className="size-3" /> Hết hợp tác
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
            <Handshake className="mx-auto mb-2 size-6 opacity-40" /> Chưa có đối tác nào.
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
            <Plus className="size-4" /> Thêm đối tác
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
