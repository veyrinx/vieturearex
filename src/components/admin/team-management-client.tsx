"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Users, Pencil, Plus, X, Check, Loader2, Briefcase } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getRank } from "@/lib/constants/ranks";
import {
  TEAM_DUTY_PRESETS,
  TEAM_DUTIES_MAX,
  TEAM_DUTY_MAX,
  TEAM_FOCUS_MAX,
  TEAM_TITLE_MAX,
} from "@/lib/constants/team-duties";
import { cn } from "@/lib/utils";
import type { PublicUserProfile, UserRole } from "@/lib/types/content";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  it: "IT",
  admin: "Admin",
  manager: "Manager",
  support: "Support",
  team_member: "Team",
  agent: "Giao Dịch Viên",
  seller: "Người Bán",
  user: "User",
};

const ROLE_ORDER: Record<UserRole, number> = {
  super_admin: 0, it: 1, admin: 2, manager: 3, support: 4, agent: 5,
  team_member: 6, seller: 7, user: 8,
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  it: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  admin: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  manager: "text-green-400 bg-green-400/10 border-green-400/30",
  support: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  team_member: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  agent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  seller: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  user: "text-muted-foreground bg-muted border-border",
};

type TeamFields = { title: string; focus: string; duties: string[]; order: number };

function fieldsOf(p: PublicUserProfile): TeamFields {
  return {
    title: p.team_title ?? "",
    focus: p.team_focus ?? "",
    duties: p.team_duties ?? [],
    order: p.team_order ?? 0,
  };
}

export function TeamManagementClient({ initialProfiles }: { initialProfiles: PublicUserProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, startTransition] = useTransition();
  const [toggling, setToggling] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<TeamFields | null>(null);
  const [dutyInput, setDutyInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Thứ tự trong bảng admin khớp thứ tự ngoài /team: team_order trước, hoà thì
  // theo cấp bậc — nhìn là biết trang công khai đang xếp thế nào.
  const sorted = [...profiles].sort(
    (a, b) =>
      (a.team_order ?? 0) - (b.team_order ?? 0) ||
      (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99),
  );

  async function toggle(userId: string, show: boolean) {
    setToggling(userId);
    try {
      const res = await fetch("/api/admin/users/show-in-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, show }),
      });
      if (res.ok) {
        startTransition(() => {
          setProfiles((prev) =>
            prev.map((p) => (p.id === userId ? { ...p, show_in_team: show } : p)),
          );
        });
      } else {
        toast.error("Không đổi được trạng thái hiển thị.");
      }
    } finally {
      setToggling(null);
    }
  }

  function startEdit(p: PublicUserProfile) {
    setEditing(p.id);
    setDraft(fieldsOf(p));
    setDutyInput("");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
    setDutyInput("");
  }

  function addDuty(value: string) {
    const duty = value.trim().slice(0, TEAM_DUTY_MAX);
    if (!duty || !draft) return;
    if (draft.duties.some((d) => d.toLowerCase() === duty.toLowerCase())) {
      setDutyInput("");
      return;
    }
    if (draft.duties.length >= TEAM_DUTIES_MAX) {
      toast.warning(`Tối đa ${TEAM_DUTIES_MAX} mảng phụ trách.`);
      return;
    }
    setDraft({ ...draft, duties: [...draft.duties, duty] });
    setDutyInput("");
  }

  function removeDuty(duty: string) {
    if (!draft) return;
    setDraft({ ...draft, duties: draft.duties.filter((d) => d !== duty) });
  }

  async function save(userId: string) {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: draft.title,
          focus: draft.focus,
          duties: draft.duties,
          order: draft.order,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "Không lưu được.");
        return;
      }
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                team_title: draft.title || null,
                team_focus: draft.focus || null,
                team_duties: draft.duties,
                team_order: draft.order,
              }
            : p,
        ),
      );
      toast.success("Đã lưu. Trang /team cập nhật sau tối đa 2 phút.");
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  const shown = profiles.filter((p) => p.show_in_team).length;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em]">QUẢN LÝ ĐỘI NGŨ</h1>
        <p className="text-sm text-muted-foreground">
          Bật/tắt hiển thị và khai mảng phụ trách của từng người trên trang /team. Hiện đang hiển thị{" "}
          <span className="font-semibold text-foreground">{shown}</span> / {profiles.length} thành viên.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-2 size-8 opacity-30" />
          <p>Chưa có thành viên nào.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {sorted.map((p) => {
            const rankMeta = getRank(p.points ?? 0);
            const isToggling = toggling === p.id;
            const isEditing = editing === p.id;
            const duties = p.team_duties ?? [];
            return (
              <div key={p.id} className="px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.display_name ?? ""} fill className="object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                        {(p.display_name ?? "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {p.display_name ?? "Ẩn danh"}
                      </span>
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold", ROLE_COLORS[p.role])}>
                        {ROLE_LABELS[p.role]}
                      </span>
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold", rankMeta.bg, rankMeta.color)}>
                        {p.rank ?? rankMeta.rank}
                      </span>
                      {p.team_title && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {p.team_title}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.team_focus ?? p.bio ?? "Chưa có tiểu sử"} ·{" "}
                      {(p.points ?? 0).toLocaleString("vi-VN")} pts
                    </p>
                    {duties.length > 0 && !isEditing && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {duties.map((d) => (
                          <span
                            key={d}
                            className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(p))}
                      aria-label={isEditing ? "Đóng" : "Sửa mảng phụ trách"}
                      className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
                    </button>
                    {isToggling && <LoadingSpinner className="size-4" />}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(p.show_in_team)}
                      disabled={isToggling || pending}
                      onClick={() => void toggle(p.id, !p.show_in_team)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        p.show_in_team ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                          p.show_in_team ? "translate-x-4" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {isEditing && draft && (
                  <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Chức danh
                        </span>
                        <input
                          value={draft.title}
                          maxLength={TEAM_TITLE_MAX}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                          placeholder="VD: Trưởng ban Nội dung"
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                      </label>
                      <label className="block sm:w-28">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Thứ tự
                        </span>
                        <input
                          type="number"
                          value={draft.order}
                          onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Đang làm gì
                      </span>
                      <input
                        value={draft.focus}
                        maxLength={TEAM_FOCUS_MAX}
                        onChange={(e) => setDraft({ ...draft, focus: e.target.value })}
                        placeholder="VD: Biên tập tin OB50 và cập nhật wiki vũ khí"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                      />
                      <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                        {draft.focus.length}/{TEAM_FOCUS_MAX}
                      </span>
                    </label>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mảng phụ trách ({draft.duties.length}/{TEAM_DUTIES_MAX})
                      </span>
                      {draft.duties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {draft.duties.map((d) => (
                            <span
                              key={d}
                              className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                            >
                              {d}
                              <button
                                type="button"
                                onClick={() => removeDuty(d)}
                                aria-label={`Xoá ${d}`}
                                className="opacity-60 transition-opacity hover:opacity-100"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex gap-2">
                        <input
                          value={dutyInput}
                          maxLength={TEAM_DUTY_MAX}
                          onChange={(e) => setDutyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addDuty(dutyInput);
                            }
                          }}
                          placeholder="Gõ mảng khác rồi Enter"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => addDuty(dutyInput)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <Plus className="size-4" />
                          Thêm
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {TEAM_DUTY_PRESETS.filter((d) => !draft.duties.includes(d)).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => addDuty(d)}
                            className="rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            + {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Briefcase className="size-3.5 shrink-0" />
                        Nội dung này hiện công khai trên /team và gửi cho Google.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Huỷ
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void save(p.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Lưu
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
