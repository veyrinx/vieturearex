"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, ShieldCheck, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CAPABILITIES, DEFAULT_ROLE_CAPABILITIES, ROLE_KEYS, ROLE_LABELS, BUILTIN_ROLE_LEVELS,
  parseRoleCapabilities, parseCustomRoles, getResolvedRoles,
  type RoleCapabilityMap, type CapabilityKey, type RoleKey, type CustomRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

const BUILTIN_COLOR: Record<RoleKey, string> = {
  super_admin: "border-red-500/40 bg-red-500/10 text-red-500",
  admin: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  it: "border-violet-500/40 bg-violet-500/10 text-violet-500",
  manager: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  support: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  user: "border-border bg-muted text-muted-foreground",
};

const CUSTOM_COLORS = ["red", "orange", "amber", "yellow", "lime", "emerald", "teal", "cyan", "blue", "indigo", "violet", "purple", "fuchsia", "pink"] as const;
type CustomColor = typeof CUSTOM_COLORS[number];

const colorClass = (color?: string) => {
  const map: Record<string, string> = {
    red: "border-red-400/40 bg-red-400/10 text-red-400",
    orange: "border-orange-400/40 bg-orange-400/10 text-orange-400",
    amber: "border-amber-400/40 bg-amber-400/10 text-amber-400",
    yellow: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
    lime: "border-lime-400/40 bg-lime-400/10 text-lime-400",
    emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
    teal: "border-teal-400/40 bg-teal-400/10 text-teal-400",
    cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-400",
    blue: "border-blue-400/40 bg-blue-400/10 text-blue-400",
    indigo: "border-indigo-400/40 bg-indigo-400/10 text-indigo-400",
    violet: "border-violet-400/40 bg-violet-400/10 text-violet-400",
    purple: "border-purple-400/40 bg-purple-400/10 text-purple-400",
    fuchsia: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-400",
    pink: "border-pink-400/40 bg-pink-400/10 text-pink-400",
  };
  return color && map[color] ? map[color] : "border-border bg-muted text-muted-foreground";
};

// ─── inline edit state for custom roles ──────────────────────────────────────
type EditingRole = { key: string; label: string; level: number; color: string };

const EMPTY_NEW: EditingRole = { key: "", label: "", level: 50, color: "blue" };

export function PermissionsMatrix({
  initialRaw,
  initialCustomRolesRaw,
}: {
  initialRaw?: string | null;
  initialCustomRolesRaw?: string | null;
}) {
  const [matrix, setMatrix] = useState<RoleCapabilityMap>(() => parseRoleCapabilities(initialRaw));
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => parseCustomRoles(initialCustomRolesRaw));
  const [saving, setSaving] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);

  // Inline editing: null = closed, "new" = create form, key = editing that role
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditingRole>(EMPTY_NEW);

  useEffect(() => { setMatrix(parseRoleCapabilities(initialRaw)); }, [initialRaw]);
  useEffect(() => { setCustomRoles(parseCustomRoles(initialCustomRolesRaw)); }, [initialCustomRolesRaw]);

  const resolved = useMemo(() => getResolvedRoles(
    JSON.stringify(customRoles),
    JSON.stringify(matrix),
  ), [customRoles, matrix]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof CAPABILITIES[number][]>();
    for (const c of CAPABILITIES) {
      const arr = m.get(c.group) ?? [];
      arr.push(c);
      m.set(c.group, arr);
    }
    return Array.from(m.entries());
  }, []);

  const has = (roleKey: string, cap: CapabilityKey) => {
    if (roleKey === "super_admin") return true;
    const meta = resolved.find((r) => r.key === roleKey);
    if (meta && meta.level >= BUILTIN_ROLE_LEVELS.super_admin) return true;
    return matrix[roleKey]?.includes(cap) ?? false;
  };

  const isAlwaysOn = (roleKey: string) => {
    if (roleKey === "super_admin") return true;
    const meta = resolved.find((r) => r.key === roleKey);
    return !!(meta && meta.level >= BUILTIN_ROLE_LEVELS.super_admin);
  };

  const toggle = (roleKey: string, cap: CapabilityKey) => {
    if (isAlwaysOn(roleKey)) return;
    setMatrix((prev) => {
      const cur = new Set(prev[roleKey] ?? []);
      if (cur.has(cap)) cur.delete(cap); else cur.add(cap);
      return { ...prev, [roleKey]: Array.from(cur) };
    });
  };

  const reset = () => {
    setMatrix(DEFAULT_ROLE_CAPABILITIES);
    setCustomRoles([]);
  };

  // ── persist capability matrix ──────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "permissions.role_capabilities", value: JSON.stringify(matrix) }),
      });
      if (!res.ok) { toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Không lưu được."); return; }
      toast.success("Đã lưu phân quyền.");
    } finally { setSaving(false); }
  };

  // ── persist custom roles ───────────────────────────────────────────────────
  const saveCustomRoles = async (next: CustomRole[]) => {
    setSavingCustom(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "permissions.custom_roles", value: JSON.stringify(next) }),
      });
      if (!res.ok) { toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Không lưu được role."); return; }
      setCustomRoles(next);
      toast.success("Đã lưu danh sách role.");
    } finally { setSavingCustom(false); }
  };

  // ── new / edit helpers ─────────────────────────────────────────────────────
  const openNew = () => { setEditing("new"); setEditData(EMPTY_NEW); };
  const openEdit = (r: CustomRole) => {
    setEditing(r.key);
    setEditData({ key: r.key, label: r.label, level: r.level, color: r.color ?? "blue" });
  };
  const cancelEdit = () => setEditing(null);

  const commitEdit = async () => {
    const key = editData.key.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
    if (!key || !editData.label.trim()) { toast.error("Cần nhập key và tên role."); return; }
    if ((ROLE_KEYS as readonly string[]).includes(key)) { toast.error("Key trùng với role hệ thống."); return; }
    const isNew = editing === "new";
    if (isNew && customRoles.some((r) => r.key === key)) { toast.error("Key đã tồn tại."); return; }
    const entry: CustomRole = {
      key,
      label: editData.label.trim(),
      level: editData.level,
      color: editData.color,
      capabilities: isNew ? [] : (customRoles.find((r) => r.key === editing)?.capabilities ?? []),
    };
    const next = isNew
      ? [...customRoles, entry]
      : customRoles.map((r) => r.key === editing ? entry : r);
    await saveCustomRoles(next);
    setEditing(null);
  };

  const deleteRole = async (key: string) => {
    const next = customRoles.filter((r) => r.key !== key);
    // also clean matrix
    const newMatrix = { ...matrix };
    delete newMatrix[key];
    setMatrix(newMatrix);
    await saveCustomRoles(next);
  };

  // all columns in sorted order
  const allRoles = resolved; // already sorted by level desc

  return (
    <div className="space-y-6">

      {/* ── header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-bold uppercase tracking-[0.06em]">
            <ShieldCheck className="size-4 text-primary dark:text-amber-400" />
            Ma trận phân quyền
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉnh trực tiếp tại đây.{" "}
            <span className="font-bold text-red-500">Super Admin</span> và role có level ≥ 200 luôn có toàn quyền.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-3.5" /> Mặc định
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Lưu quyền
          </Button>
        </div>
      </div>

      {/* ── custom role manager ── */}
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Role tuỳ chỉnh</p>
          <Button size="sm" variant="outline" onClick={openNew} className="gap-1.5 text-xs">
            <Plus className="size-3" /> Tạo role mới
          </Button>
        </div>

        {/* existing custom roles */}
        <div className="flex flex-wrap gap-2">
          {customRoles.map((r) => (
            <div key={r.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", colorClass(r.color))}>
              <span>{r.label}</span>
              <span className="font-mono font-normal opacity-60">lv{r.level}</span>
              <button type="button" onClick={() => openEdit(r)} className="ml-0.5 opacity-60 hover:opacity-100"><Pencil className="size-3" /></button>
              <button type="button" onClick={() => void deleteRole(r.key)} className="opacity-60 hover:opacity-100 hover:text-red-400"><Trash2 className="size-3" /></button>
            </div>
          ))}
          {customRoles.length === 0 && editing !== "new" && (
            <p className="text-xs text-muted-foreground/60">Chưa có role tuỳ chỉnh.</p>
          )}
        </div>

        {/* inline form */}
        {editing !== null && (
          <div className="mt-3 rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {editing === "new" ? "Tạo role mới" : `Sửa: ${editing}`}
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">Key (a-z_)</label>
                <input
                  className="h-8 w-32 rounded-md border border-border bg-muted px-2 text-xs font-mono"
                  value={editData.key}
                  onChange={(e) => setEditData((p) => ({ ...p, key: e.target.value }))}
                  disabled={editing !== "new"}
                  placeholder="vd_moderator"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">Tên hiển thị</label>
                <input
                  className="h-8 w-36 rounded-md border border-border bg-muted px-2 text-xs"
                  value={editData.label}
                  onChange={(e) => setEditData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Moderator"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">Level (số)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  className="h-8 w-24 rounded-md border border-border bg-muted px-2 text-xs font-mono"
                  value={editData.level}
                  onChange={(e) => setEditData((p) => ({ ...p, level: Math.max(0, Math.min(1000, Number(e.target.value))) }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">Màu badge</label>
                <select
                  className="h-8 rounded-md border border-border bg-muted px-2 text-xs"
                  value={editData.color}
                  onChange={(e) => setEditData((p) => ({ ...p, color: e.target.value }))}
                >
                  {CUSTOM_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-1">
                <Button size="sm" onClick={() => void commitEdit()} disabled={savingCustom} className="gap-1">
                  {savingCustom ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Lưu
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}><X className="size-3" /></Button>
              </div>
            </div>
            {editing !== "new" && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Capabilities chỉnh trong bảng bên dưới — tìm cột <span className="font-mono font-bold">{editing}</span>.
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Built-in levels: user=20 · support=40 · manager=60 · admin=100 · it=150 · super_admin=200</span>
              <span className="text-amber-500">Level ≥ 200 → tự động full quyền</span>
            </div>
          </div>
        )}
      </div>

      {/* ── capability matrix ── */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm" style={{ minWidth: `${(allRoles.length * 60) + 220}px` }}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/80 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
                Quyền
              </th>
              {allRoles.map((r) => (
                <th key={r.key} className="px-2 py-2 text-center">
                  <span className={cn(
                    "inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    r.isBuiltin ? BUILTIN_COLOR[r.key as RoleKey] : colorClass(r.color),
                  )}>
                    {r.label}
                  </span>
                  <div className="mt-0.5 text-[9px] font-mono text-muted-foreground/50">lv{r.level}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, caps]) => (
              <Fragment key={group}>
                <tr className="bg-muted/20">
                  <td colSpan={allRoles.length + 1} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary dark:text-amber-400">
                    {group}
                  </td>
                </tr>
                {caps.map((cap) => (
                  <tr key={cap.key} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 backdrop-blur">
                      <p className="text-sm font-semibold">{cap.label}</p>
                      <code className="text-[10px] text-muted-foreground">{cap.key}</code>
                    </td>
                    {allRoles.map((r) => {
                      const on = has(r.key, cap.key);
                      const locked = isAlwaysOn(r.key);
                      return (
                        <td key={r.key} className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(r.key, cap.key)}
                            disabled={locked}
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-md border text-xs transition",
                              on
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
                                : "border-border bg-background text-muted-foreground/40 hover:border-primary/40",
                              locked && "cursor-not-allowed opacity-60",
                            )}
                            title={locked ? "Luôn bật (level ≥ 200)" : on ? "Đang bật — bấm để tắt" : "Đang tắt — bấm để bật"}
                          >
                            {on ? "✓" : "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
