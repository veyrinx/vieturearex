"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Eye, CalendarDays, Mail, User, Shield, ShieldOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { UserItem, UserRole } from "@/lib/types/content";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  admin:       { label: "Admin",       color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  manager:     { label: "Quản Lý",     color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  support:     { label: "CSKH",        color: "bg-green-500/10 text-green-500 border-green-500/20" },
  user:        { label: "Người Dùng",  color: "bg-muted text-muted-foreground border-border" },
};

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
};

export function UserEditDialog({ user, open, onOpenChange, onSaved, currentUserEmail }: UserEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isReseting, setIsReseting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (user && open) {
      reset({
        display_name: user.display_name ?? user.email.split("@")[0],
        email: user.email,
      });
      setTempPassword(null);
    }
  }, [user, open, reset]);

  if (!user) return null;

  const meta = ROLE_META[user.role];
  const isSelf = user.email === currentUserEmail;
  const canAct = !isSelf;

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) { toast.info("Chưa có thay đổi nào."); return; }
    setIsSaving(true);
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
    setIsSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Không thể cập nhật thông tin.");
      return;
    }
    toast.success("Đã cập nhật thông tin tài khoản.");
    onOpenChange(false);
    await onSaved();
  });

  const toggleBan = async () => {
    if (!canAct) return;
    const willBan = !user.is_banned;
    if (!confirm(`${willBan ? "Khóa" : "Mở khóa"} tài khoản ${user.email}?`)) return;
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
    if (!confirm(`Reset mật khẩu cho ${user.email}?`)) return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg uppercase tracking-wide">
            Chỉnh sửa tài khoản
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs uppercase tracking-widest">
            Chỉ Super Admin mới có quyền thực hiện thao tác này.
          </DialogDescription>
        </DialogHeader>

        {/* User profile summary */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            user.is_banned ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary",
          )}>
            {(user.display_name || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.display_name || user.email.split("@")[0]}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", meta.color)}>
            {meta.label}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-muted/20 p-2.5 text-center">
            <Eye className="size-3.5 text-muted-foreground" />
            <span className="text-base font-bold text-foreground">{user.views.toLocaleString("vi-VN")}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Lượt xem</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-muted/20 p-2.5 text-center">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span className="text-base font-bold text-foreground">
              {new Date(user.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Tham gia</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-muted/20 p-2.5 text-center">
            <div className={cn("size-3 rounded-full", user.is_banned ? "bg-red-500" : "bg-green-500")} />
            <span className="text-base font-bold text-foreground">
              {user.is_banned ? "Khóa" : "OK"}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Trạng thái</span>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <User className="size-3" /> Tên hiển thị
            </label>
            <Input
              {...register("display_name")}
              placeholder="Tên hiển thị..."
              className="border-border bg-background text-foreground"
            />
            {errors.display_name && (
              <p className="text-xs text-rose-500">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Mail className="size-3" /> Email
            </label>
            <Input
              {...register("email")}
              type="email"
              placeholder="email@arex.tech"
              className="border-border bg-background text-foreground"
            />
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSaving || !isDirty} className="w-full rounded-xl">
            {isSaving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
          </Button>
        </form>

        {/* Quick actions */}
        {canAct && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Hành động nhanh
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isBanning}
                onClick={toggleBan}
                className={cn(
                  "gap-2 rounded-xl text-sm",
                  user.is_banned
                    ? "border-green-500/30 text-green-600 hover:bg-green-500/10"
                    : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10",
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
                className="gap-2 rounded-xl border-blue-500/30 text-blue-600 text-sm hover:bg-blue-500/10"
              >
                <KeyRound className="size-3.5" />
                {isReseting ? "Đang reset..." : "Reset MK"}
              </Button>
            </div>

            {/* Temp password display */}
            {tempPassword && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                  Mật khẩu tạm thời
                </p>
                <code className="block rounded-lg border border-border bg-background px-3 py-2 font-mono text-base font-bold tracking-widest text-foreground">
                  {tempPassword}
                </code>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Gửi mật khẩu này cho người dùng. Họ nên đổi mật khẩu ngay.
                </p>
              </div>
            )}
          </div>
        )}

        {isSelf && (
          <p className="text-center text-xs text-muted-foreground">
            Đây là tài khoản của bạn — không thể thực hiện hành động nhanh với chính mình.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
