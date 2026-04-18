"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download, Search, Trash2, Users, Shield, ChevronUp, ChevronDown,
  Lock, Unlock, KeyRound, Copy, Check, ChevronRight, Info, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { UserItem, UserRole } from "@/lib/types/content";
import { cn } from "@/lib/utils";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

const ROLE_META: Record<string, { label: string; color: string; level: number }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20",    level: 100 },
  admin:       { label: "Admin",       color: "bg-amber-500/10 text-amber-500 border-amber-500/20", level: 80 },
  manager:     { label: "Quản Lý",     color: "bg-blue-500/10 text-blue-500 border-blue-500/20",   level: 60 },
  support:     { label: "CSKH",        color: "bg-green-500/10 text-green-500 border-green-500/20", level: 40 },
  user:        { label: "Người Dùng",  color: "bg-muted text-muted-foreground border-border",       level: 20 },
};

const ROLE_ORDER: UserRole[] = ["super_admin", "admin", "manager", "support", "user"];

const PERMISSION_MATRIX = [
  { label: "Quản lý người dùng",      super_admin: "✅", admin: "✅ (giới hạn)", manager: "❌", support: "❌", user: "❌" },
  { label: "Thay đổi vai trò",        super_admin: "Tất cả", admin: "≤ Manager", manager: "❌", support: "❌", user: "❌" },
  { label: "Khóa / Mở khóa tài khoản", super_admin: "✅", admin: "✅ (≤ Manager)", manager: "❌", support: "❌", user: "❌" },
  { label: "Reset mật khẩu",          super_admin: "✅", admin: "✅ (≤ Manager)", manager: "❌", support: "❌", user: "❌" },
  { label: "Xóa tài khoản",           super_admin: "✅", admin: "❌", manager: "❌", support: "❌", user: "❌" },
  { label: "Quản lý nội dung",        super_admin: "✅", admin: "✅", manager: "✅", support: "❌", user: "❌" },
  { label: "Phát trực tiếp",          super_admin: "✅", admin: "✅", manager: "✅", support: "❌", user: "❌" },
  { label: "Đánh giá / Bình luận",    super_admin: "✅", admin: "✅", manager: "✅", support: "✅", user: "❌" },
  { label: "Nhật ký hoạt động",       super_admin: "✅", admin: "✅", manager: "❌", support: "❌", user: "❌" },
  { label: "Cài đặt hệ thống",        super_admin: "✅", admin: "✅", manager: "❌", support: "❌", user: "❌" },
  { label: "Quảng cáo Google Ads",    super_admin: "✅", admin: "✅", manager: "❌", support: "❌", user: "❌" },
];

type SortKey = "email" | "role" | "views" | "created_at";
type SortDir = "asc" | "desc";

type UserRoleTableProps = {
  users: UserItem[];
  onSaved: () => Promise<void>;
};

function exportCSV(users: UserItem[]) {
  const headers = ["Tên hiển thị", "Email", "Vai trò", "Trạng thái", "Lượt xem", "Ngày tham gia"];
  const rows = users.map((u) => [
    u.display_name || u.email.split("@")[0],
    u.email,
    ROLE_META[u.role]?.label ?? u.role,
    u.is_banned ? "Bị khóa" : "Hoạt động",
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

function TempPasswordDialog({
  open, password, email, onClose,
}: { open: boolean; password: string; email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <KeyRound className="size-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold uppercase tracking-wide">Mật khẩu tạm thời</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Mật khẩu mới
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-base font-bold tracking-widest text-foreground border border-border">
                {password}
              </code>
              <Button size="icon" variant="outline" onClick={copy} className="shrink-0 size-9 rounded-lg">
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Gửi mật khẩu này cho người dùng. Họ nên đổi mật khẩu ngay sau khi đăng nhập.
          </p>

          <Button onClick={onClose} className="w-full rounded-xl">Đã hiểu</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-foreground">Phân quyền hệ thống</span>
        </div>
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-muted-foreground">Quyền</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="px-3 py-2.5 font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", ROLE_META[r].color)}>
                      {ROLE_META[r].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.label} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.label}</td>
                  {ROLE_ORDER.map((r) => {
                    const val = row[r as keyof typeof row];
                    return (
                      <td key={r} className={cn(
                        "px-3 py-2 whitespace-nowrap",
                        val === "❌" ? "text-muted-foreground/50" : "text-foreground",
                      )}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function UserRoleTable({ users, onSaved }: UserRoleTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [resetingId, setResetingId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "created_at", dir: "desc" });
  const [tempPw, setTempPw] = useState<{ password: string; email: string } | null>(null);
  const [editUser, setEditUser] = useState<UserItem | null>(null);

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
  const isAdmin = currentUserLoaded && (currentUser?.role === "admin" || currentUser?.role === "super_admin");
  const callerLevel = ROLE_META[currentUser?.role ?? "user"]?.level ?? 20;

  const stats = useMemo(() => {
    const counts = ROLE_ORDER.reduce<Record<string, number>>((acc, r) => { acc[r] = 0; return acc; }, {});
    users.forEach((u) => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [users]);

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const q = search.toLowerCase();
      const matchQ = !q || u.email.toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
      const matchR = roleFilter === "all" || u.role === roleFilter;
      return matchQ && matchR;
    });
    list = [...list].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sort.key === "role") { va = ROLE_ORDER.indexOf(a.role); vb = ROLE_ORDER.indexOf(b.role); }
      else if (sort.key === "views") { va = a.views; vb = b.views; }
      else if (sort.key === "created_at") { va = a.created_at; vb = b.created_at; }
      else { va = a.email; vb = b.email; }
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, roleFilter, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key === k
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Không thể cập nhật quyền.");
      return;
    }
    toast.success("Đã cập nhật vai trò.");
    await onSaved();
  };

  const toggleBan = async (user: UserItem) => {
    if (user.email === currentUserEmail) { toast.error("Không thể tự khóa mình."); return; }
    const willBan = !user.is_banned;
    setBanningId(user.id);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_banned: willBan }),
    });
    setBanningId(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Không thể thay đổi trạng thái.");
      return;
    }
    toast.success(willBan ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    await onSaved();
  };

  const resetPassword = async (user: UserItem) => {
    setResetingId(user.id);
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    setResetingId(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Không thể reset mật khẩu.");
      return;
    }
    const { tempPassword } = await res.json();
    setTempPw({ password: tempPassword, email: user.email });
  };

  const deleteUser = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { toast.error("Không thể xóa tài khoản."); return; }
      toast.success("Đã xóa tài khoản.");
      await onSaved();
    } catch {
      toast.error("Lỗi mạng, không thể xóa tài khoản.");
    } finally {
      setDeletingId(null);
    }
  };

  // Which roles can the current user assign?
  const assignableRoles = ROLE_ORDER.filter((r) => {
    if (isSuperAdmin) return true;
    // admin can only assign roles with level < admin
    return (ROLE_META[r]?.level ?? 0) < (ROLE_META["admin"]?.level ?? 80);
  });

  return (
    <div className="space-y-4">
      <PermissionMatrix />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          return (
            <button
              key={role}
              onClick={() => setRoleFilter((f) => f === role ? "all" : role)}
              className={cn(
                "glass-card flex flex-col items-center gap-0.5 rounded-xl p-3 text-center transition-all hover:scale-[1.02]",
                roleFilter === role && "ring-2 ring-primary",
              )}
            >
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold", meta.color)}>
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
          Xuất CSV
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
                <th className="hidden px-4 py-3 sm:table-cell text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Trạng thái
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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 size-8 opacity-30" />
                    <p className="text-sm">Không tìm thấy người dùng nào.</p>
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const meta = ROLE_META[user.role];
                const targetLevel = ROLE_META[user.role]?.level ?? 20;
                const canManage = isAdmin && targetLevel < callerLevel && user.email !== currentUserEmail;
                const isUpdating = updatingId === user.id;
                const isBanning = banningId === user.id;
                const isReseting = resetingId === user.id;
                const isDeleting = deletingId === user.id;

                return (
                  <tr key={user.id} className={cn("transition-colors hover:bg-muted/30", user.is_banned && "opacity-60 bg-red-500/5")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          user.is_banned ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary",
                        )}>
                          {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-foreground">
                              {user.display_name || user.email.split("@")[0]}
                            </p>
                            {user.is_banned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-500">
                                <Lock className="size-2.5" /> Khóa
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Select
                        defaultValue={user.role}
                        disabled={isUpdating || !canManage}
                        onValueChange={(v) => updateRole(user.id, v as UserRole)}
                      >
                        <SelectTrigger className={cn("h-8 w-36 border text-xs font-semibold", meta.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_META[r].label}
                            </SelectItem>
                          ))}
                          {/* Always show current role even if not assignable */}
                          {!assignableRoles.includes(user.role) && (
                            <SelectItem value={user.role} className="text-xs" disabled>
                              {meta.label}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        user.is_banned
                          ? "bg-red-500/10 text-red-500"
                          : "bg-green-500/10 text-green-600 dark:text-green-400",
                      )}>
                        <span className={cn("size-1.5 rounded-full", user.is_banned ? "bg-red-500" : "bg-green-500")} />
                        {user.is_banned ? "Bị khóa" : "Hoạt động"}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm font-medium">{user.views.toLocaleString("vi-VN")}</span>
                    </td>

                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isUpdating && <Badge variant="secondary" className="text-[10px]">Đang lưu...</Badge>}

                        {/* Edit */}
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditUser(user)}
                            title="Chỉnh sửa tài khoản"
                            className="size-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}

                        {/* Ban/Unban */}
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isBanning}
                            onClick={() => toggleBan(user)}
                            title={user.is_banned ? "Mở khóa" : "Khóa tài khoản"}
                            className={cn(
                              "size-8",
                              user.is_banned
                                ? "text-green-600 hover:bg-green-500/10"
                                : "text-amber-500 hover:bg-amber-500/10",
                            )}
                          >
                            {isBanning
                              ? <Shield className="size-3.5 animate-pulse" />
                              : user.is_banned
                                ? <Unlock className="size-3.5" />
                                : <Lock className="size-3.5" />
                            }
                          </Button>
                        )}

                        {/* Reset password */}
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isReseting}
                            onClick={() => resetPassword(user)}
                            title="Reset mật khẩu"
                            className="size-8 text-blue-500 hover:bg-blue-500/10"
                          >
                            {isReseting
                              ? <Shield className="size-3.5 animate-pulse" />
                              : <KeyRound className="size-3.5" />
                            }
                          </Button>
                        )}

                        {/* Delete */}
                        {isSuperAdmin && user.email !== currentUserEmail && (
                          <ConfirmDeleteDialog
                            itemName={user.email}
                            itemType="tài khoản"
                            description="Tài khoản sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục."
                            onConfirm={() => deleteUser(user.id)}
                            trigger={
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={isDeleting}
                                title="Xóa tài khoản"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                {isDeleting ? <Shield className="size-3.5 animate-pulse" /> : <Trash2 className="size-3.5" />}
                              </Button>
                            }
                          />
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

      {tempPw && (
        <TempPasswordDialog
          open
          password={tempPw.password}
          email={tempPw.email}
          onClose={() => setTempPw(null)}
        />
      )}

      <UserEditDialog
        user={editUser}
        open={Boolean(editUser)}
        onOpenChange={(open) => { if (!open) setEditUser(null); }}
        onSaved={onSaved}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
