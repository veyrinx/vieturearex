"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Award, CheckCircle2, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  selected_title: string | null;
  role: string;
};

type TitleRow = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  rarity: string;
};

const RARITY_CLS: Record<string, string> = {
  common:    "border-border bg-muted text-muted-foreground",
  rare:      "border-blue-400/40 bg-blue-400/10 text-blue-500",
  epic:      "border-amber-400/40 bg-amber-400/10 text-amber-500",
  legendary: "border-purple-400/40 bg-purple-400/10 text-purple-500",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Thường", rare: "Hiếm", epic: "Sử thi", legendary: "Huyền thoại",
};

export function TitleGrantPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? [])),
      fetch("/api/users/cosmetics").then((r) => r.json()).then((d) => setTitles(d.titles ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const str = `${u.display_name ?? ""} ${u.email}`.toLowerCase();
    return str.includes(q.toLowerCase());
  });

  const grantTitle = async (userId: string, titleName: string | null) => {
    setSaving(userId);
    const res = await fetch(`/api/admin/users/${userId}/title`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleName }),
    });
    if (res.ok) {
      toast.success(titleName ? `Đã cấp danh hiệu "${titleName}"` : "Đã xóa danh hiệu");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, selected_title: titleName } : u));
      if (selected?.id === userId) setSelected((s) => s ? { ...s, selected_title: titleName } : s);
    } else {
      toast.error("Không thể cập nhật danh hiệu");
    }
    setSaving(null);
  };

  const initials = (u: UserRow) =>
    (u.display_name ?? u.email)[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
          Cấp Danh Hiệu
        </h1>
        <p className="text-sm text-muted-foreground">
          Chọn người dùng rồi chọn danh hiệu muốn cấp. Mỗi người chỉ hiển thị 1 danh hiệu.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* User list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm người dùng..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Người dùng</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Danh hiệu hiện tại</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((u) => (
                  <tr key={u.id} className={cn(
                    "border-b border-border/60 transition-colors hover:bg-muted/30",
                    selected?.id === u.id && "bg-primary/5",
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary dark:bg-amber-400/15 dark:text-amber-400">
                            {initials(u)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{u.display_name ?? "—"}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.selected_title ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:text-amber-400">
                          <Award className="size-2.5" /> {u.selected_title}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(u)}
                        className="rounded-lg border border-border px-3 py-1 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        Cấp
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Không tìm thấy người dùng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Title picker panel */}
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                Cấp cho: <span className="text-primary dark:text-amber-400">{selected.display_name ?? selected.email}</span>
              </p>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-muted">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Remove title option */}
            <button
              onClick={() => void grantTitle(selected.id, null)}
              disabled={saving === selected.id}
              className="w-full rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              {saving === selected.id ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Xóa danh hiệu"}
            </button>

            <div className="space-y-2">
              {titles.map((t) => {
                const isActive = selected.selected_title === t.name;
                return (
                  <button
                    key={t.id}
                    onClick={() => void grantTitle(selected.id, t.name)}
                    disabled={saving === selected.id || isActive}
                    className={cn(
                      "group w-full rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-primary/40 bg-primary/8 dark:border-amber-400/40 dark:bg-amber-400/8"
                        : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: t.color }}>{t.name}</span>
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", RARITY_CLS[t.rarity])}>
                            {RARITY_LABEL[t.rarity]}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[10px] text-muted-foreground">{t.description}</p>
                        )}
                      </div>
                      {isActive ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary dark:text-amber-400" />
                      ) : saving === selected.id ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Award className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Chọn người dùng bên trái để cấp danh hiệu</p>
          </div>
        )}
      </div>
    </div>
  );
}
