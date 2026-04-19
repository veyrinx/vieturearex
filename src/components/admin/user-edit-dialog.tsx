"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Eye, CalendarDays, Mail, User, Shield, ShieldOff, KeyRound,
  Copy, Check, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserItem } from "@/lib/types/content";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
  admin:       { label: "Admin",       color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" },
  it:          { label: "IT",          color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20" },
  manager:     { label: "Quản Lý",     color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
  support:     { label: "CSKH",        color: "text-green-500",  bg: "bg-green-500/10 border-green-500/20" },
  user:        { label: "Người Dùng",  color: "text-muted-foreground", bg: "bg-muted border-border" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-teal-600",
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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (user && open) {
      reset({
        display_name: user.display_name ?? user.email.split("@")[0],
        email: user.email,
      });
      setTempPassword(null);
      setCopiedPw(false);
    }
  }, [user, open, reset]);

  if (!user) return null;

  const meta = ROLE_META[user.role] ?? ROLE_META.user;
  const isSelf = user.email === currentUserEmail;
  const canAct = !isSelf;
  const canEditEmail = callerRole === "super_admin";
  const avatarColor = getAvatarColor(user.email);
  const displayName = user.display_name || user.email.split("@")[0];
  const joinDate = new Date(user.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) { toast.info("Chưa có thay đổi nào."); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          action: "update_info",
          display_name: values.display_name !== (user.display_name ?? "") ? values.display_name : undefined,
          email: values.email !== user.email ? values.email : undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể cập nhật thông tin.");
        return;
      }
      toast.success("Đã cập nhật thông tin tài khoản.");
      onOpenChange(false);
      await onSaved();
    } catch {
      toast.error("Lỗi mạng, không thể lưu thay đổi.");
    } finally {
      setIsSaving(false);
    }
  });

  const toggleBan = async () => {
    if (!canAct) return;
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
      toast.error(err.error ?? "Không thể thay đổi trạng thái.");
      return;
    }
    toast.success(willBan ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    onOpenChange(false);
    await onSaved();
  };

  const resetPassword = async () => {
    if (!canAct) return;
    setIsReseting(true);
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    setIsReseting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể reset mật khẩu.");
      return;
    }
    const { tempPassword: pw } = (await res.json()) as { tempPassword: string };
    setTempPassword(pw);
  };

  const copyPw = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-0 text-foreground overflow-hidden">

        {/* ── Header with avatar ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-card px-6 pt-6 pb-5 dark:from-amber-400/10 dark:via-amber-400/5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-[40px] dark:bg-amber-400/10" />
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-base font-bold uppercase tracking-[0.08em]">
              Chỉnh sửa tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-extrabold text-white shadow-lg",
              user.is_banned ? "from-red-400 to-red-600 opacity-60" : avatarColor,
            )}>
              {displayName[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-heading text-base font-bold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.bg, meta.color)}>
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
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-4">
          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Eye,         label: "Lượt xem", value: user.views.toLocaleString("vi-VN") },
              { icon: CalendarDays, label: "Tham gia", value: joinDate },
              { icon: Shield,      label: "ID",        value: user.id.slice(0, 6).toUpperCase() },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 py-3 text-center">
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground leading-tight">{value}</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* ── Edit form ── */}
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <User className="size-3" /> Tên hiển thị
              </label>
              <Input
                {...register("display_name")}
                placeholder="Tên hiển thị..."
              />
              {errors.display_name && (
                <p className="text-xs text-rose-500">{errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Mail className="size-3" /> Email
                {!canEditEmail && (
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Chỉ Super Admin
                  </span>
                )}
              </label>
              <Input
                {...register("email")}
                type="email"
                placeholder="email@example.com"
                disabled={!canEditEmail}
                className={!canEditEmail ? "opacity-60 cursor-not-allowed" : ""}
              />
              {errors.email && (
                <p className="text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSaving || !isDirty} className="w-full gap-2 rounded-xl">
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>

          {/* ── Quick actions ── */}
          {canAct ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hành động nhanh</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBanning}
                  onClick={toggleBan}
                  className={cn(
                    "gap-2 rounded-xl text-sm font-semibold",
                    user.is_banned
                      ? "border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-400"
                      : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
                  )}
                >
                  {user.is_banned
                    ? <><ShieldOff className="size-3.5" /> Mở khóa</>
                    : <><Shield className="size-3.5" /> Khóa TK</>
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isReseting}
                  onClick={resetPassword}
                  className="gap-2 rounded-xl border-blue-500/30 text-sm font-semibold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                >
                  <KeyRound className="size-3.5" />
                  {isReseting ? "Đang reset..." : "Reset MK"}
                </Button>
              </div>

              {/* Temp password */}
              {tempPassword && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    Mật khẩu tạm thời
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-base font-bold tracking-widest">
                      {tempPassword}
                    </code>
                    <Button size="icon" variant="outline" onClick={copyPw} className="size-9 shrink-0 rounded-lg">
                      {copiedPw ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Gửi cho người dùng. Yêu cầu đổi mật khẩu ngay sau khi đăng nhập.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
              Đây là tài khoản của bạn — không thể thực hiện hành động nhanh với chính mình.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
