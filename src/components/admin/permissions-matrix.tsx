"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CAPABILITIES, DEFAULT_ROLE_CAPABILITIES, ROLE_KEYS, ROLE_LABELS,
  parseRoleCapabilities, type RoleCapabilityMap, type CapabilityKey, type RoleKey,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ROLE_COLOR: Record<RoleKey, string> = {
  super_admin: "border-red-500/40 bg-red-500/10 text-red-500",
  admin: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  it: "border-violet-500/40 bg-violet-500/10 text-violet-500",
  manager: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  support: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  user: "border-border bg-muted text-muted-foreground",
};

export function PermissionsMatrix({ initialRaw }: { initialRaw?: string | null }) {
  const [matrix, setMatrix] = useState<RoleCapabilityMap>(() => parseRoleCapabilities(initialRaw));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMatrix(parseRoleCapabilities(initialRaw)); }, [initialRaw]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof CAPABILITIES[number][]>();
    for (const c of CAPABILITIES) {
      const arr = m.get(c.group) ?? [];
      arr.push(c);
      m.set(c.group, arr);
    }
    return Array.from(m.entries());
  }, []);

  const has = (role: RoleKey, cap: CapabilityKey) =>
    role === "super_admin" ? true : matrix[role]?.includes(cap) ?? false;

  const toggle = (role: RoleKey, cap: CapabilityKey) => {
    if (role === "super_admin") return; // always-on
    setMatrix((prev) => {
      const cur = new Set(prev[role] ?? []);
      if (cur.has(cap)) cur.delete(cap); else cur.add(cap);
      return { ...prev, [role]: Array.from(cur) };
    });
  };

  const reset = () => setMatrix(DEFAULT_ROLE_CAPABILITIES);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "permissions.role_capabilities",
          value: JSON.stringify(matrix),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Không lưu được phân quyền.");
        return;
      }
      toast.success("Đã lưu phân quyền.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-bold uppercase tracking-[0.06em]">
            <ShieldCheck className="size-4 text-primary dark:text-amber-400" />
            Ma trận phân quyền
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉnh trực tiếp tại đây thay vì sửa role qua Supabase.{" "}
            <span className="font-bold text-red-500">Super Admin</span> luôn có toàn quyền (không tắt được).
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-3.5" /> Mặc định
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Lưu
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Quyền
              </th>
              {ROLE_KEYS.map((r) => (
                <th key={r} className="px-2 py-2 text-center">
                  <span className={cn("inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", ROLE_COLOR[r])}>
                    {ROLE_LABELS[r]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, caps]) => (
              <Fragment key={group}>
                <tr className="bg-muted/20">
                  <td colSpan={ROLE_KEYS.length + 1} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary dark:text-amber-400">
                    {group}
                  </td>
                </tr>
                {caps.map((cap) => (
                  <tr key={cap.key} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <p className="text-sm font-semibold">{cap.label}</p>
                      <code className="text-[10px] text-muted-foreground">{cap.key}</code>
                    </td>
                    {ROLE_KEYS.map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(r, cap.key)}
                          disabled={r === "super_admin"}
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-md border text-xs transition",
                            has(r, cap.key)
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
                              : "border-border bg-background text-muted-foreground/40 hover:border-primary/40",
                            r === "super_admin" && "opacity-60 cursor-not-allowed",
                          )}
                          title={has(r, cap.key) ? "Đang bật — bấm để tắt" : "Đang tắt — bấm để bật"}
                        >
                          {has(r, cap.key) ? "✓" : "·"}
                        </button>
                      </td>
                    ))}
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
