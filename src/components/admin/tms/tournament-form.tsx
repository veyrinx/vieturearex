"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS } from "@/lib/tms/types";
import type { TmsTournament } from "@/lib/tms/types";

type Props = { tournament?: TmsTournament };

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const FIELD = "h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const LABEL = "text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block";

export function TournamentForm({ tournament }: Props) {
  const router = useRouter();
  const isEdit = Boolean(tournament);

  const [form, setForm] = useState({
    name: tournament?.name ?? "",
    slug: tournament?.slug ?? "",
    description: tournament?.description ?? "",
    mode: tournament?.mode ?? "4v4",
    format: tournament?.format ?? "hybrid",
    max_teams: tournament?.max_teams ?? 16,
    team_size: tournament?.team_size ?? 4,
    prize_pool: tournament?.prize_pool ?? "",
    rules: tournament?.rules ?? "",
    banner_url: tournament?.banner_url ?? "",
    status: tournament?.status ?? "draft",
    registration_open_at: tournament?.registration_open_at?.slice(0, 16) ?? "",
    registration_close_at: tournament?.registration_close_at?.slice(0, 16) ?? "",
    start_at: tournament?.start_at?.slice(0, 16) ?? "",
    end_at: tournament?.end_at?.slice(0, 16) ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | number) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "name" && !isEdit) next.slug = slug(String(v));
      return next;
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Cần nhập tên và slug."); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/tms/tournaments/${tournament!.id}` : "/api/tms/tournaments";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          max_teams: Number(form.max_teams),
          team_size: Number(form.team_size),
          registration_open_at: form.registration_open_at || null,
          registration_close_at: form.registration_close_at || null,
          start_at: form.start_at || null,
          end_at: form.end_at || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Lỗi lưu giải đấu.");
        return;
      }
      toast.success(isEdit ? "Đã cập nhật." : "Đã tạo giải đấu.");
      if (!isEdit) {
        const data = (await res.json()) as { id: string };
        router.push(`/admin/tournaments/${data.id}`);
      } else {
        router.refresh();
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {isEdit ? "Chỉnh sửa thông tin" : "Thông tin giải đấu"}
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Tên giải đấu *</label>
          <input className={FIELD} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Arex FF Championship S1" />
        </div>
        <div>
          <label className={LABEL}>Slug (URL) *</label>
          <input className={FIELD + " font-mono"} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="arex-ff-s1" />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Mô tả</label>
          <textarea className={FIELD + " h-20 py-2 resize-none"} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Mode</label>
          <select className={FIELD} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
            {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Format</label>
          <select className={FIELD} value={form.format} onChange={(e) => set("format", e.target.value)}>
            {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Max teams</label>
          <input type="number" min={2} max={256} className={FIELD} value={form.max_teams} onChange={(e) => set("max_teams", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Team size (người/đội)</label>
          <input type="number" min={1} max={20} className={FIELD} value={form.team_size} onChange={(e) => set("team_size", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Trạng thái</label>
          <select className={FIELD} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Giải thưởng</label>
          <input className={FIELD} value={form.prize_pool} onChange={(e) => set("prize_pool", e.target.value)} placeholder="500.000đ + Rank Booster" />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Banner URL</label>
          <input className={FIELD} value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} placeholder="https://..." />
          {form.banner_url && (
            <div className="mt-2 rounded-xl overflow-hidden aspect-[21/6] bg-muted border border-border">
              <img
                src={form.banner_url}
                alt="Banner preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </div>
        <div>
          <label className={LABEL}>Đăng ký từ</label>
          <input type="datetime-local" className={FIELD} value={form.registration_open_at} onChange={(e) => set("registration_open_at", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Đăng ký đến</label>
          <input type="datetime-local" className={FIELD} value={form.registration_close_at} onChange={(e) => set("registration_close_at", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Bắt đầu thi đấu</label>
          <input type="datetime-local" className={FIELD} value={form.start_at} onChange={(e) => set("start_at", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Kết thúc</label>
          <input type="datetime-local" className={FIELD} value={form.end_at} onChange={(e) => set("end_at", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Luật thi đấu</label>
          <textarea className={FIELD + " h-28 py-2 resize-y"} value={form.rules} onChange={(e) => set("rules", e.target.value)} placeholder="Nhập luật thi đấu..." />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? "Cập nhật" : "Tạo giải đấu"}
        </Button>
      </div>
    </div>
  );
}
