"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Rocket, Plus, Trash2, Save, Loader2, ExternalLink, Eye, Cpu, Hand,
} from "lucide-react";
import {
  PROJECT_STATUS_META,
  PROJECT_PRIORITY_META,
  type ResolvedProject,
  type ProjectPriority,
} from "@/lib/constants/projects";
import { TOOLS } from "@/lib/constants/tools";
import { SITE_ROUTES } from "@/lib/constants/site-routes";

const ROUTE_SUGGESTIONS = Array.from(
  new Set([...TOOLS.map((t) => t.href), ...SITE_ROUTES]),
).sort();
const CATEGORIES = ["Công cụ", "Cộng đồng", "Nội dung", "Esports", "Hệ thống", "Khác"];

type Row = ResolvedProject & { _id: string };

const uid = () => Math.random().toString(36).slice(2);
const withRowId = (p: ResolvedProject): Row => ({ ...p, _id: uid() });

function ProgressBar({ progress, colorText }: { progress: number; colorText: string }) {
  // colorText dạng "text-x ..." → lấy để tô thanh; fallback dùng currentColor
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${colorText}`}
        style={{ width: `${progress}%`, backgroundColor: "currentColor" }}
      />
    </div>
  );
}

function StatusBadge({ p }: { p: ResolvedProject }) {
  const meta = PROJECT_STATUS_META[p.status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}
    >
      {p.source === "auto" ? <Cpu className="size-3" /> : <Hand className="size-3" />}
      {meta.label} · {p.progress}%
    </span>
  );
}

// ── Chế độ chỉ xem (admin & role thấp hơn) ─────────────────────────────────
function ReadOnlyCard({ p }: { p: ResolvedProject }) {
  const statusColor = PROJECT_STATUS_META[p.status].color.split(" ")[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-foreground">{p.name}</h3>
          {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
        </div>
        <StatusBadge p={p} />
      </div>
      {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
      <div className="mt-3">
        <ProgressBar progress={p.progress} colorText={statusColor} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {p.path && (
          <span className="inline-flex items-center gap-1 font-mono">{p.path}</span>
        )}
        {p.targetDate && <span>Dự kiến: <b className="text-foreground">{p.targetDate}</b></span>}
        {p.priority && (
          <span className={`rounded px-1.5 py-0.5 ${PROJECT_PRIORITY_META[p.priority].color}`}>
            Ưu tiên: {PROJECT_PRIORITY_META[p.priority].label}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProjectsPanel({
  initialProjects,
  canEdit,
}: {
  initialProjects: ResolvedProject[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(initialProjects.map(withRowId));
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      withRowId({
        id: uid(),
        name: "",
        status: "planning",
        statusLabel: PROJECT_STATUS_META.planning.label,
        progress: PROJECT_STATUS_META.planning.progress,
        source: "manual",
      }),
    ]);

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r._id !== id));

  async function save() {
    const projects = rows
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        description: r.description?.trim() || undefined,
        path: r.path?.trim() || undefined,
        category: r.category?.trim() || undefined,
        targetDate: r.targetDate?.trim() || undefined,
        priority: r.priority,
        manualProgress: typeof r.manualProgress === "number" ? r.manualProgress : undefined,
      }))
      .filter((r) => r.name.length > 0);

    setSaving(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Lưu thất bại.");
      setRows((json.projects ?? []).map(withRowId));
      toast.success("Đã lưu. Tiến độ được tính lại tự động.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-black text-foreground">
            <Rocket className="size-6 text-primary" /> Quản lý dự án
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Theo dõi các phần <b>sắp ra mắt</b>. Tiến độ <b>tự tính</b>: đối chiếu code (route đã có
            chưa) với web (đang khóa <i>sắp ra mắt</i>/<i>bảo trì</i> hay đã mở).{" "}
            {canEdit ? (
              <span className="text-primary">Bạn là Super Admin — được chỉnh sửa.</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <Eye className="size-3.5" /> Chế độ chỉ xem — chỉ Super Admin mới sửa được.
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu thay đổi
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Chưa có dự án nào. Bấm “Thêm dự án” để bắt đầu." : "Chưa có dự án nào."}
          </p>
        </div>
      ) : !canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => <ReadOnlyCard key={r._id} p={r} />)}
        </div>
      ) : (
        <>
          <datalist id="project-route-suggestions">
            {ROUTE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
          </datalist>
          <div className="space-y-3">
            {rows.map((r) => {
              const statusColor = PROJECT_STATUS_META[r.status].color.split(" ")[0];
              return (
                <div key={r._id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge p={r} />
                    <div className="flex items-center gap-1.5">
                      {r.path && (
                        <a
                          href={r.path}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                          title="Mở thử"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      <button
                        onClick={() => removeRow(r._id)}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-rose-500 transition-colors hover:bg-rose-500/10"
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3"><ProgressBar progress={r.progress} colorText={statusColor} /></div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tên dự án</label>
                      <input
                        value={r.name}
                        onChange={(e) => update(r._id, { name: e.target.value })}
                        placeholder="Tên phần sắp ra"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Route (tự tính tiến độ)</label>
                      <input
                        list="project-route-suggestions"
                        value={r.path ?? ""}
                        onChange={(e) => update(r._id, { path: e.target.value })}
                        placeholder="/vd-route (bỏ trống nếu chưa có)"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_170px_150px]">
                    <select
                      value={r.category ?? ""}
                      onChange={(e) => update(r._id, { category: e.target.value || undefined })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">— Nhóm —</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={r.priority ?? "normal"}
                      onChange={(e) => update(r._id, { priority: e.target.value as ProjectPriority })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    >
                      {(Object.keys(PROJECT_PRIORITY_META) as ProjectPriority[]).map((k) => (
                        <option key={k} value={k}>Ưu tiên: {PROJECT_PRIORITY_META[k].label}</option>
                      ))}
                    </select>
                    <input
                      value={r.targetDate ?? ""}
                      onChange={(e) => update(r._id, { targetDate: e.target.value })}
                      placeholder="Dự kiến: 20/08/2026"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                    <input
                      value={r.description ?? ""}
                      onChange={(e) => update(r._id, { description: e.target.value })}
                      placeholder="Mô tả ngắn (tùy chọn)"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <div className="space-y-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.manualProgress ?? ""}
                        onChange={(e) =>
                          update(r._id, {
                            manualProgress: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        placeholder="% thủ công"
                        disabled={!!r.path?.trim()}
                        title={r.path?.trim() ? "Có route thì tiến độ tự tính, không dùng % thủ công." : "Dùng khi chưa có route."}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addRow}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-4" /> Thêm dự án
          </button>
        </>
      )}
    </div>
  );
}
