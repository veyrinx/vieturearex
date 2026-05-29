"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getRank } from "@/lib/constants/ranks";
import { cn } from "@/lib/utils";
import type { PublicUserProfile, UserRole } from "@/lib/types/content";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  it: "IT",
  admin: "Admin",
  manager: "Manager",
  support: "Support",
  team_member: "Team",
  user: "User",
};

const ROLE_ORDER: Record<UserRole, number> = {
  super_admin: 0, it: 1, admin: 2, manager: 3, support: 4, team_member: 5, user: 6,
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  it: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  admin: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  manager: "text-green-400 bg-green-400/10 border-green-400/30",
  support: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  team_member: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  user: "text-muted-foreground bg-muted border-border",
};

export function TeamManagementClient({ initialProfiles }: { initialProfiles: PublicUserProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, startTransition] = useTransition();
  const [toggling, setToggling] = useState<string | null>(null);

  const sorted = [...profiles].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99),
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
      }
    } finally {
      setToggling(null);
    }
  }

  const shown = profiles.filter((p) => p.show_in_team).length;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-black uppercase tracking-[0.08em]">QUẢN LÝ ĐỘI NGŨ</h1>
        <p className="text-sm text-muted-foreground">
          Bật/tắt hiển thị thành viên trên trang /team. Hiện đang hiển thị{" "}
          <span className="font-semibold text-foreground">{shown}</span> / {profiles.length} thành viên.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-2 size-8 opacity-30" />
          <p>Chưa có thành viên nào.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {sorted.map((p) => {
            const rankMeta = getRank(p.points ?? 0);
            const isToggling = toggling === p.id;
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
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
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {p.bio ?? "Chưa có tiểu sử"} &bull;{" "}
                    {(p.points ?? 0).toLocaleString("vi-VN")} pts
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
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
            );
          })}
        </div>
      )}
    </section>
  );
}
