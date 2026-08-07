"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Mail, User, Shield, KeyRound, Copy, Check, BadgeCheck, BadgeX,
  LogOut, Trash2, Lock, Unlock, Activity, CalendarDays, Eye,
  ChevronDown, AlertTriangle, Phone, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { UserItem, UserRole } from "@/lib/types/content";
import { BUILTIN_ROLE_LEVELS, ROLE_KEYS, ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  BADGE_GROUP_LABELS,
  MAX_USER_BADGES,
  USER_BADGES,
  type BadgeGroup,
} from "@/lib/constants/user-badges";

/** Màu riêng của hộp thoại; nhãn và cấp lấy từ nguồn chung ở permissions.ts. */
const ROLE_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  super_admin: { color: "text-red-500",     bg: "bg-red-500/10 border-red-500/30",         dot: "bg-red-500" },
  it:          { color: "text-violet-500",  bg: "bg-violet-500/10 border-violet-500/30",   dot: "bg-violet-500" },
  admin:       { color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/30",     dot: "bg-amber-500" },
  manager:     { color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/30",       dot: "bg-blue-500" },
  support:     { color: "text-green-500",   bg: "bg-green-500/10 border-green-500/30",     dot: "bg-green-500" },
  agent:       { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-500" },
  team_member: { color: "text-sky-500",     bg: "bg-sky-500/10 border-sky-500/30",         dot: "bg-sky-500" },
  seller:      { color: "text-orange-500",  bg: "bg-orange-500/10 border-orange-500/30",   dot: "bg-orange-500" },
  user:        { color: "text-muted-foreground", bg: "bg-muted border-border",             dot: "bg-muted-foreground" },
};

const ROLE_META: Record<string, { label: string; color: string; bg: string; dot: string; level: number }> =
  Object.fromEntries(
    ROLE_KEYS.map((r) => [
      r,
      { label: ROLE_LABELS[r], ...(ROLE_STYLE[r] ?? ROLE_STYLE.user), level: BUILTIN_ROLE_LEVELS[r] ?? 20 },
    ]),
  );

const ROLE_ORDER: UserRole[] = [
  "super_admin", "it", "admin", "manager", "support", "agent", "team_member", "seller", "user",
];

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
  bio: z.string().max(300, "Tối đa 300 ký tự.").optional(),
  phone: z.string().max(20, "Tối đa 20 ký tự.").optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

export type UserEditDialogProps = {
  user: UserItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  currentUserEmail: string | null;
  callerRole?: string | null;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

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
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [isUpdatingBadges, setIsUpdatingBadges] = useState(false);

  const { register, reset, handleSubmit, formState: { errors, isDirty } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (user && open) {
      reset({ display_name: user.display_name ?? user.email.split("@")[0], email: user.email, bio: user.bio ?? "", phone: user.phone ?? "" });
      setTempPassword(null);
      setCopiedPw(false);
      setSelectedRole(user.role);
      setSelectedBadges(user.badges ?? []);
    }
  }, [user, open, reset]);

  if (!user) return null;

  const meta = ROLE_META[user.role] ?? ROLE_META.user;
  const isSelf = user.email === currentUserEmail;
  const callerLevel =
    ROLE_META[callerRole ?? "user"]?.level
    ?? BUILTIN_ROLE_LEVELS[(callerRole ?? "user") as keyof typeof BUILTIN_ROLE_LEVELS]
    ?? 20;
  const targetLevel = ROLE_META[user.role]?.level ?? 20;
  const canManage = !isSelf && targetLevel < callerLevel;
  const canEditEmail = callerRole === "super_admin" || callerRole === "it";
  const canVerify = callerRole === "it";
  const canDelete = callerRole === "super_admin" && !isSelf;
  const assignableRoles = ROLE_ORDER.filter((r) => (ROLE_META[r]?.level ?? 0) < callerLevel);
  // Nhãn tách khỏi role: chỉ hiện nhãn mà cấp của người đang thao tác gán được.
  const canManageBadges = callerRole === "super_admin" || targetLevel < callerLevel;
  const visibleBadges = USER_BADGES.filter((b) => callerLevel >= b.minLevel);
  const badgeGroups = [...new Set(visibleBadges.map((b) => b.group))] as BadgeGroup[];
  const savedBadges = user.badges ?? [];
  const badgesDirty =
    selectedBadges.length !== savedBadges.length
    || selectedBadges.some((b) => !savedBadges.includes(b));
  const avatarGradient = getAvatarColor(user.email);
  const displayName = user.display_name || user.email.split("@")[0];
  const joinDate = new Date(user.created_at || "").toLocaleDateString("vi-VN");

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
          bio: values.bio !== (user.bio ?? "") ? (values.bio ?? "") : undefined,
          phone: values.phone !== (user.phone ?? "") ? (values.phone ?? "") : undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể cập nhật."); return;
      }
      toast.success("Đã cập nhật thông tin tài khoản.");
      onOpenChange(false);
      await onSaved();
    } catch { toast.error("Lỗi mạng, không thể lưu."); }
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
    toast.success(`Đã đổi vai trò thành ${ROLE_META[selectedRole]?.label}.`);
    onOpenChange(false);
    await onSaved();
  };

  const toggleBadge = (key: string) => {
    setSelectedBadges((prev) => {
      if (prev.includes(key)) return prev.filter((b) => b !== key);
      if (prev.length >= MAX_USER_BADGES) {
        toast.error(`Tối đa ${MAX_USER_BADGES} nhãn.`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const updateBadges = async () => {
    setIsUpdatingBadges(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, action: "update_badges", badges: selectedBadges }),
    });
    setIsUpdatingBadges(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể cập nhật nhãn."); return;
    }
    toast.success("Đã cập nhật nhãn hiển thị.");
    onOpenChange(false);
    await onSaved();
  };

  const toggleBan = async () => {
    if (!canManage) return;
    setIsBanning(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_banned: !user.is_banned }),
    });
    setIsBanning(false);
    if (!res.ok) { toast.error("Không thể thay đổi trạng thái."); return; }
    toast.success(user.is_banned ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
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
    if (!res.ok) { toast.error("Không thể reset mật khẩu."); return; }
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
    if (!res.ok) { toast.error("Không thể đăng xuất."); return; }
    toast.success("Đã đăng xuất khỏi tất cả thiết bị.");
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
    if (!res.ok) { toast.error("Không thể thay đổi trạng thái xác minh."); return; }
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border bg-card p-0 text-foreground">

        {/* ── Profile Header ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-card to-card px-5 pb-4 pt-5 dark:from-amber-400/8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/8 blur-[50px] dark:bg-amber-400/8" />
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Quản lý tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={displayName}
                  width={64}
                  height={64}
                  className={cn(
                    "size-16 rounded-2xl object-cover shadow-lg ring-2 ring-border",
                    user.is_banned && "opacity-50 grayscale",
                  )}
                />
              ) : (
                <div className={cn(
                  "flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-lg ring-2 ring-border",
                  avatarGradient,
                  user.is_banned && "opacity-50",
                )}>
                  {displayName[0].toUpperCase()}
                </div>
              )}
              {user.is_verified && (
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border">
                  <BadgeCheck className="size-4 text-blue-500" />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base font-bold text-foreground truncate">{displayName}</h2>
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", meta.bg, meta.color)}>
                  <span className={cn("mr-1 size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  user.is_banned ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-600 dark:text-green-400",
                )}>
                  <Activity className="size-2.5" />
                  {user.is_banned ? "Bị khóa" : "Hoạt động"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
              <button
                onClick={copyId}
                className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {copiedId ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                {user.id.slice(0, 12)}···
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Eye,          label: "Lượt xem",  value: Number(user.views ?? 0).toLocaleString("vi-VN") },
              { icon: CalendarDays, label: "Tham gia",   value: joinDate },
              { icon: Shield,       label: "Cấp độ",     value: `Lv. ${ROLE_META[user.role]?.level ?? 20}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-background/50 py-2 text-center">
                <Icon className="size-3 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground leading-tight">{value}</span>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="space-y-5 px-5 pb-6 pt-4">

          {/* ── Thông tin cơ bản ── */}
          <section>
            <SectionLabel>Thông tin cơ bản</SectionLabel>
            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <User className="size-3" /> Tên hiển thị
                </label>
                <Input {...register("display_name")} placeholder="Tên hiển thị..." className="h-9 bg-background" />
                {errors.display_name && <p className="text-xs text-rose-500">{errors.display_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="size-3" /> Email
                  {!canEditEmail && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                      Chỉ IT / Super Admin
                    </span>
                  )}
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  disabled={!canEditEmail}
                  className={cn("h-9 bg-background", !canEditEmail && "cursor-not-allowed opacity-60")}
                />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Phone className="size-3" /> Số điện thoại
                  </label>
                  <Input
                    {...register("phone")}
                    placeholder="0xxxxxxxxx"
                    maxLength={20}
                    className="h-9 bg-background"
                  />
                  {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3" /> Giới thiệu (bio)
                </label>
                <textarea
                  {...register("bio")}
                  rows={2}
                  maxLength={300}
                  placeholder="Vài dòng giới thiệu..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {errors.bio && <p className="text-xs text-rose-500">{errors.bio.message}</p>}
              </div>

              <Button type="submit" disabled={isSaving || !isDirty} size="sm" className="w-full gap-1.5 rounded-xl">
                {isSaving ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            </form>
          </section>

          {/* ── Vai trò ── */}
          {assignableRoles.length > 0 && !isSelf && (
            <section>
              <SectionLabel>Vai trò & quyền hạn</SectionLabel>
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                    <SelectTrigger className="h-9 flex-1 bg-background text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          <span className={cn("font-semibold", ROLE_META[r]?.color)}>{ROLE_META[r]?.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">Lv.{ROLE_META[r]?.level}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdatingRole || selectedRole === user.role}
                    onClick={updateRole}
                    className="gap-1.5 rounded-xl px-3 bg-background"
                  >
                    <ChevronDown className="size-3.5" />
                    {isUpdatingRole ? "Đang cập nhật..." : "Cập nhật"}
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Vai trò hiện tại: <span className={cn("font-bold", meta.color)}>{meta.label}</span> · Cấp độ {ROLE_META[user.role]?.level ?? 20}
                </p>
              </div>
            </section>
          )}

          {/* ── Nhãn hiển thị (tách khỏi vai trò) ── */}
          {canManageBadges && visibleBadges.length > 0 && (
            <section>
              <SectionLabel>Nhãn hiển thị</SectionLabel>
              <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Nhãn chỉ để trưng bày trên hồ sơ, <b>không cấp quyền</b>. Một người có thể mang
                  nhiều nhãn cùng lúc — quyền hạn vẫn do vai trò ở trên quyết định.
                </p>

                {badgeGroups.map((group) => (
                  <div key={group}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      {BADGE_GROUP_LABELS[group]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleBadges
                        .filter((b) => b.group === group)
                        .map((b) => {
                          const Icon = b.icon;
                          const active = selectedBadges.includes(b.key);
                          return (
                            <button
                              key={b.key}
                              type="button"
                              title={b.description}
                              onClick={() => toggleBadge(b.key)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition",
                                active
                                  ? cn(b.color, b.border)
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <Icon className="size-3" />
                              {b.label}
                              {b.verified && <BadgeCheck className="size-3 text-blue-500" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Đã chọn {selectedBadges.length}/{MAX_USER_BADGES}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdatingBadges || !badgesDirty}
                    onClick={updateBadges}
                    className="gap-1.5 rounded-xl bg-background px-3"
                  >
                    {isUpdatingBadges ? "Đang lưu..." : "Lưu nhãn"}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ── Bảo mật ── */}
          {canManage && (
            <section>
              <SectionLabel>Bảo mật & phiên đăng nhập</SectionLabel>
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                {/* Ban/unban */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBanning}
                  onClick={toggleBan}
                  className={cn(
                    "w-full justify-start gap-2 rounded-xl bg-background",
                    user.is_banned
                      ? "border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-400"
                      : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
                  )}
                >
                  {user.is_banned ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                  {isBanning ? "Đang xử lý..." : user.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                </Button>

                {/* Reset password */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isReseting}
                  onClick={resetPassword}
                  className="w-full justify-start gap-2 rounded-xl border-blue-500/30 bg-background text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                >
                  <KeyRound className="size-3.5" />
                  {isReseting ? "Đang tạo mật khẩu..." : "Reset mật khẩu tạm thời"}
                </Button>

                {tempPassword && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">Mật khẩu tạm thời</p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-widest">
                        {tempPassword}
                      </code>
                      <Button size="icon" variant="outline" onClick={copyPw} className="size-8 shrink-0 rounded-lg bg-background">
                        {copiedPw ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                      </Button>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">Yêu cầu người dùng đổi mật khẩu sau khi đăng nhập.</p>
                  </div>
                )}

                {/* Force signout */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSigningOut}
                  onClick={forceSignOut}
                  className="w-full justify-start gap-2 rounded-xl border-rose-500/30 bg-background text-rose-500 hover:bg-rose-500/10"
                >
                  <LogOut className="size-3.5" />
                  {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất tất cả thiết bị"}
                </Button>
              </div>
            </section>
          )}

          {!canManage && !isSelf && (
            <section>
              <SectionLabel>Bảo mật</SectionLabel>
              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                Không đủ quyền để quản lý tài khoản này.
              </div>
            </section>
          )}

          {/* ── IT: Verified + Delete ── */}
          {(canVerify || canDelete) && (
            <section>
              <SectionLabel>Quản trị cấp cao</SectionLabel>
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                {canVerify && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVerifying}
                    onClick={toggleVerified}
                    className={cn(
                      "w-full justify-start gap-2 rounded-xl bg-background",
                      user.is_verified
                        ? "border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        : "border-blue-500/30 text-blue-500 hover:bg-blue-500/10",
                    )}
                  >
                    {user.is_verified
                      ? <><BadgeX className="size-3.5" /> {isVerifying ? "Đang thu hồi..." : "Thu hồi tích xanh"}</>
                      : <><BadgeCheck className="size-3.5" /> {isVerifying ? "Đang cấp..." : "Cấp tích xanh xác minh"}</>
                    }
                  </Button>
                )}

                {canDelete && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-500">
                      <AlertTriangle className="size-3" /> Vùng nguy hiểm
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDeleting}
                      onClick={deleteAccount}
                      className="w-full justify-start gap-2 rounded-xl border-rose-500/40 bg-background text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="size-3.5" />
                      {isDeleting ? "Đang xóa..." : "Xóa tài khoản vĩnh viễn"}
                    </Button>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">Hành động không thể hoàn tác. Toàn bộ dữ liệu bị xóa.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
