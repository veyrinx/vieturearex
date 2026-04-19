"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Eye, CalendarDays, Mail, User, Shield, ShieldOff, KeyRound,
  Copy, Check, Activity, BadgeCheck, BadgeX, LogOut, Trash2,
  ChevronDown, UserCog, Lock, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { UserItem, UserRole } from "@/lib/types/content";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string; bg: string; level: number }> = {
  it:          { label: "IT",          color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20", level: 150 },
  super_admin: { label: "Super Admin", color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20",       level: 100 },
  admin:       { label: "Admin",       color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20",   level: 80 },
  manager:     { label: "Quản Lý",     color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20",     level: 60 },
  support:     { label: "CSKH",        color: "text-green-500",  bg: "bg-green-500/10 border-green-500/20",   level: 40 },
  user:        { label: "Người Dùng",  color: "text-muted-foreground", bg: "bg-muted border-border",          level: 20 },
};

const ROLE_ORDER: UserRole[] = ["it", "super_admin", "admin", "manager", "support", "user"];

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const editSchema = z.object({
  display_name: z.string().min(1, "Tên hiển thị không được để trống.").max(60, "Tối đa 60 ký tự."),
  email: z.string().email("Email không hợp lệ."),
});

type EditFormValues = z.infer<typeof editSchema>;

type UserEditDialogProps = {
  user: UserItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  currentUserEmail: string | null;
  callerRole?: string | null;
};

export function UserEditDialog({ user, open, onOpenChange, onSaved, currentUserEmail, callerRole }: UserEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isReseting, setIsReseting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");

  const {
    register, reset, handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (user && open) {
      reset({ display_name: user.display_name ?? user.email.split("@")[0], email: user.email });
      setTempPassword(null);
      setCopiedPw(false);
      setSelectedRole(user.role);
    }
  }, [user, open, reset]);

  if (!user) return null;

  const meta = ROLE_META[user.role] ?? ROLE_META.user;
  const isSelf = user.email === currentUserEmail;
  const canAct = !isSelf;
  const callerLevel = ROLE_META[callerRole ?? "user"]?.level ?? 20;
  const targetLevel = ROLE_META[user.role]?.level ?? 20;
  const canManage = canAct && targetLevel < callerLevel;
  const canEditEmail = callerRole === "super_admin" || callerRole === "it";
  const canVerify = callerRole === "it";
  const canDelete = (callerRole === "super_admin" || callerRole === "it") && canAct;
  const avatarColor = getAvatarColor(user.email);
  const displayName = user.display_name || user.email.split("@")[0];
  const joinDate = new Date(user.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Assignable roles: only roles with level < callerLevel
  const assignableRoles = ROLE_ORDER.filter((r) => (ROLE_META[r]?.level ?? 0) < callerLevel);

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) { toast.info("Chưa có thay đổi nào."); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id, action: "update_info",
          display_name: values.display_name !== (user.display_name ?? "") ? values.display_name : undefined,
          email: values.email !== user.email ? values.email : undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể cập nhật thông tin."); return;
      }
      toast.success("Đã cập nhật thông tin tài khoản.");
      onOpenChange(false);
      await onSaved();
    } catch { toast.error("Lỗi mạng, không thể lưu thay đổi."); }
    finally { setIsSaving(false); }
  });

  const updateRole = async () => {
    if (selectedRole === user.role) { toast.info("Vai trò chưa thay đổi."); return; }
    setIsUpdatingRole(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: selectedRole }),
    });
    setIsUpdatingRole(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể cập nhật vai trò."); return;
    }
    toast.success(`Đã cập nhật vai trò thành ${ROLE_META[selectedRole]?.label}.`);
    onOpenChange(false);
    await onSaved();
  };

  const toggleBan = async () => {
    if (!canManage) return;
    const willBan = !user.is_banned;
    setIsBanning(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_banned: willBan }),
    });
    setIsBanning(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể thay đổi trạng thái."); return;
    }
    toast.success(willBan ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    onOpenChange(false);
    await onSaved();
  };

  const resetPassword = async () => {
    if (!canManage) return;
    setIsReseting(true);
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    setIsReseting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể reset mật khẩu."); return;
    }
    const { tempPassword: pw } = (await res.json()) as { tempPassword: string };
    setTempPassword(pw);
  };

  const forceSignOut = async () => {
    if (!canManage) return;
    setIsSigningOut(true);
    const res = await fetch("/api/admin/users/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    setIsSigningOut(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể đăng xuất tài khoản."); return;
    }
    toast.success("Đã đăng xuất tài khoản khỏi tất cả thiết bị.");
  };

  const toggleVerified = async () => {
    if (!canVerify) return;
    setIsVerifying(true);
    const res = await fetch("/api/admin/users/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_verified: !user.is_verified }),
    });
    setIsVerifying(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể thay đổi trạng thái xác minh."); return;
    }
    toast.success(user.is_verified ? "Đã thu hồi tích xanh." : "Đã cấp tích xanh.");
    onOpenChange(false);
    await onSaved();
  };

  const deleteAccount = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    setIsDeleting(false);
    if (!res.ok) { toast.error("Không thể xóa tài khoản."); return; }
    toast.success("Đã xóa tài khoản.");
    onOpenChange(false);
    await onSaved();
  };

  const copyId = async () => {
    await navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyPw = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-0 text-foreground overflow-hidden">

        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-card px-6 pt-5 pb-4 dark:from-amber-400/10 dark:via-amber-400/5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-[40px] dark:bg-amber-400/10" />
          <DialogHeader className="mb-3">
            <DialogTitle className="font-heading text-base font-bold uppercase tracking-[0.08em]">
              Quản lý tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-extrabold text-white shadow",
              user.is_banned ? "from-red-400 to-red-600 opacity-60" : avatarColor,
            )}>
              {displayName[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-heading text-sm font-bold text-foreground">{displayName}</p>
                {user.is_verified && (
                  <BadgeCheck className="size-4 text-blue-500" />
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", meta.bg, meta.color)}>
                  {meta.label}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  user.is_banned ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-600 dark:text-green-400",
                )}>
                  <Activity className="size-2.5" />
                  {user.is_banned ? "Bị khóa" : "Hoạt động"}
                </span>
                <button onClick={copyId} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                  {copiedId ? <Check className="size-2.5 text-green-500" /> : <Copy className="size-2.5" />}
                  {user.id.slice(0, 8)}...
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { icon: Eye,         label: "Lượt xem", value: user.views.toLocaleString("vi-VN") },
              { icon: CalendarDays, label: "Tham gia", value: joinDate },
              { icon: Shield,      label: "Level",     value: String(ROLE_META[user.role]?.level ?? 20) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-background/40 py-2 text-center backdrop-blur-sm">
                <Icon className="size-3 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground leading-tight">{value}</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="info" className="px-6 pb-6 pt-2">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="info" className="flex-1 gap-1.5 text-xs">
              <User className="size-3.5" /> Thông tin
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 gap-1.5 text-xs">
              <KeyRound className="size-3.5" /> Bảo mật
            </TabsTrigger>
            {(canVerify || canDelete) && (
              <TabsTrigger value="admin" className="flex-1 gap-1.5 text-xs">
                <UserCog className="size-3.5" /> Quản trị
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Tab: Thông tin ── */}
          <TabsContent value="info" className="space-y-3 mt-0">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <User className="size-3" /> Tên hiển thị
                </label>
                <Input {...register("display_name")} placeholder="Tên hiển thị..." className="h-9" />
                {errors.display_name && <p className="text-xs text-rose-500">{errors.display_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Mail className="size-3" /> Email
                  {!canEditEmail && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Chỉ IT / Super Admin</span>
                  )}
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="email@example.com"
                  disabled={!canEditEmail}
                  className={cn("h-9", !canEditEmail && "opacity-60 cursor-not-allowed")}
                />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <Button type="submit" disabled={isSaving || !isDirty} size="sm" className="w-full gap-2 rounded-xl">
                {isSaving ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            </form>

            {/* Role change */}
            {assignableRoles.length > 0 && canManage && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Shield className="size-3" /> Thay đổi vai trò
                </label>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                    <SelectTrigger className="h-9 flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          <span className={cn("font-semibold", ROLE_META[r]?.color)}>{ROLE_META[r]?.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdatingRole || selectedRole === user.role}
                    onClick={updateRole}
                    className="gap-1.5 rounded-xl px-3"
                  >
                    <ChevronDown className="size-3.5" />
                    {isUpdatingRole ? "Đang cập nhật..." : "Cập nhật"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Bảo mật ── */}
          <TabsContent value="security" className="space-y-3 mt-0">
            {!canManage ? (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-center text-xs text-muted-foreground">
                {isSelf ? "Đây là tài khoản của bạn — không thể tự thực hiện hành động bảo mật." : "Không đủ quyền để quản lý tài khoản này."}
              </p>
            ) : (
              <>
                {/* Ban/unban */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trạng thái tài khoản</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBanning}
                    onClick={toggleBan}
                    className={cn(
                      "w-full gap-2 rounded-xl",
                      user.is_banned
                        ? "border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-400"
                        : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
                    )}
                  >
                    {user.is_banned ? <><Unlock className="size-3.5" /> Mở khóa tài khoản</> : <><Lock className="size-3.5" /> Khóa tài khoản</>}
                    {isBanning && "..."}
                  </Button>
                </div>

                {/* Reset password */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isReseting}
                    onClick={resetPassword}
                    className="w-full gap-2 rounded-xl border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                  >
                    <KeyRound className="size-3.5" />
                    {isReseting ? "Đang tạo mật khẩu..." : "Reset mật khẩu"}
                  </Button>
                  {tempPassword && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Mật khẩu tạm thời</p>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-widest">
                          {tempPassword}
                        </code>
                        <Button size="icon" variant="outline" onClick={copyPw} className="size-8 shrink-0 rounded-lg">
                          {copiedPw ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">Yêu cầu người dùng đổi mật khẩu ngay sau khi đăng nhập.</p>
                    </div>
                  )}
                </div>

                {/* Force signout */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phiên đăng nhập</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSigningOut}
                    onClick={forceSignOut}
                    className="w-full gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut className="size-3.5" />
                    {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất tất cả thiết bị"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Hủy toàn bộ phiên đăng nhập của người dùng này ngay lập tức.</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Tab: Quản trị (IT only) ── */}
          {(canVerify || canDelete) && (
            <TabsContent value="admin" className="space-y-3 mt-0">
              {/* Verified badge */}
              {canVerify && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="size-4 text-blue-500" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tích xanh xác minh</p>
                    {user.is_verified && (
                      <span className="ml-auto rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">Đang bật</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVerifying}
                    onClick={toggleVerified}
                    className={cn(
                      "w-full gap-2 rounded-xl",
                      user.is_verified
                        ? "border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        : "border-blue-500/30 text-blue-500 hover:bg-blue-500/10",
                    )}
                  >
                    {user.is_verified
                      ? <><BadgeX className="size-3.5" /> {isVerifying ? "Đang thu hồi..." : "Thu hồi tích xanh"}</>
                      : <><BadgeCheck className="size-3.5" /> {isVerifying ? "Đang cấp..." : "Cấp tích xanh"}</>
                    }
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Chỉ IT mới có thể cấp hoặc thu hồi badge xác minh.</p>
                </div>
              )}

              {/* Delete account */}
              {canDelete && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Vùng nguy hiểm</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={deleteAccount}
                    className="w-full gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    {isDeleting ? "Đang xóa..." : "Xóa tài khoản vĩnh viễn"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Hành động này không thể hoàn tác. Tất cả dữ liệu người dùng sẽ bị xóa.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
