"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Search, Trash2, Users, Shield, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserItem, UserRole } from "@/lib/types/content";

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  admin:       { label: "Admin",       color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  manager:     { label: "Quản Lý",     color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  support:     { label: "CSKH",        color: "bg-green-500/10 text-green-500 border-green-500/20" },
  user:        { label: "Người Dùng",  color: "bg-muted text-muted-foreground border-border" },
};

const ROLE_ORDER: UserRole[] = ["super_admin", "admin", "manager", "support", "user"];

type SortKey = "email" | "role" | "views" | "created_at";
type SortDir = "asc" | "desc";

type UserRoleTableProps = {
  users: UserItem[];
  onSaved: () => Promise<void>;
};

function exportCSV(users: UserItem[]) {
  const headers = ["Tên hiển thị", "Email", "Vai trò", "Lượt xem", "Ngày tham gia"];
  const rows = users.map((u) => [
    u.display_name || u.email.split("@")[0],
    u.email,
    ROLE_META[u.role]?.label ?? u.role,
    u.views,
    new Date(u.created_at).toLocaleDateString("vi-VN"),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Đã xuất ${users.length} người dùng.`);
}

export function UserRoleTable({ users, onSaved }: UserRoleTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "created_at", dir: "desc" });

  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) { setCurrentUserLoaded(true); return; }
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data?.user?.email ?? null);
      setCurrentUserLoaded(true);
    }
    init();
  }, []);

  const currentUser = users.find((u) => u.email === currentUserEmail);
  const isSuperAdmin = currentUserLoaded && currentUser?.role === "super_admin";

  // Stats
  const stats = useMemo(() => {
    const counts = ROLE_ORDER.reduce<Record<string, number>>((acc, r) => { acc[r] = 0; return acc; }, {});
    users.forEach((u) => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [users]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const q = search.toLowerCase();
      const matchQ = !q || u.email.toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
      const matchR = roleFilter === "all" || u.role === roleFilter;
      return matchQ && matchR;
    });
    list = [...list].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sort.key === "role") {
        va = ROLE_ORDER.indexOf(a.role);
        vb = ROLE_ORDER.indexOf(b.role);
      } else if (sort.key === "views") {
        va = a.views; vb = b.views;
      } else if (sort.key === "created_at") {
        va = a.created_at; vb = b.created_at;
      } else {
        va = a.email; vb = b.email;
      }
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, roleFilter, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const SortIcon = ({ k }: { k: SortKey }) => sort.key === k
    ? sort.dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
    : <ChevronUp className="size-3 opacity-20" />;

  const updateRole = async (id: string, role: UserRole) => {
    setUpdatingId(id);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    setUpdatingId(null);
    if (!res.ok) { toast.error("Không thể cập nhật quyền."); return; }
    toast.success("Đã cập nhật quyền.");
    await onSaved();
  };

  const deleteUser = async (id: string, email: string) => {
    if (email === currentUserEmail) { toast.error("Không thể xóa chính mình."); return; }
    if (!confirm(`Xóa tài khoản ${email}?`)) return;
    setDeletingId(id);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    if (!res.ok) { toast.error("Không thể xóa tài khoản."); return; }
    toast.success("Đã xóa tài khoản.");
    await onSaved();
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          return (
            <button
              key={role}
              onClick={() => setRoleFilter((f) => f === role ? "all" : role)}
              className={`glass-card flex flex-col items-center gap-0.5 rounded-xl p-3 text-center transition-all hover:scale-[1.02] ${roleFilter === role ? "ring-2 ring-primary" : ""}`}
            >
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-xl font-bold text-foreground">{stats[role] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm email, tên..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Tất cả vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {ROLE_ORDER.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportCSV(filtered)}
          className="h-9 gap-1.5 rounded-xl text-sm"
        >
          <Download className="size-3.5" />
          Xuất Excel
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length}/{users.length} người dùng
        </span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("email")} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Thành viên <SortIcon k="email" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("role")} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Vai trò <SortIcon k="role" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 sm:table-cell">
                  <button onClick={() => toggleSort("views")} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Lượt xem <SortIcon k="views" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 md:table-cell">
                  <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Tham gia <SortIcon k="created_at" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 size-8 opacity-30" />
                    <p className="text-sm">Không tìm thấy người dùng nào.</p>
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const meta = ROLE_META[user.role];
                const isUpdating = updatingId === user.id;
                const isDeleting = deletingId === user.id;
                return (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {user.display_name || user.email.split("@")[0]}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        defaultValue={user.role}
                        disabled={isUpdating || (!isSuperAdmin && (user.role === "super_admin" || user.email === currentUserEmail))}
                        onValueChange={(v) => updateRole(user.id, v as UserRole)}
                      >
                        <SelectTrigger className={`h-8 w-36 border text-xs font-semibold ${meta.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_ORDER.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_META[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm font-medium">{user.views.toLocaleString("vi-VN")}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isUpdating && (
                          <Badge variant="secondary" className="text-[10px]">Đang lưu...</Badge>
                        )}
                        {isSuperAdmin && user.email !== currentUserEmail && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => deleteUser(user.id, user.email)}
                          >
                            {isDeleting ? <Shield className="size-3.5 animate-pulse" /> : <Trash2 className="size-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
