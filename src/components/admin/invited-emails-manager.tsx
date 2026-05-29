"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Eye, EyeOff, Mail, SendHorizonal, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useInvitedEmailsQuery } from "@/hooks/use-invited-emails-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { cn } from "@/lib/utils";

const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN ?? "arexnetwork.site";

const ROLE_LABELS: Record<string, string> = {
  admin: "ADMIN",
  manager: "QUẢN LÝ",
  support: "CSKH",
  user: "NGƯỜI DÙNG",
};

type TabId = "direct" | "invite";

export function InvitedEmailsManager() {
  const queryClient = useQueryClient();
  const { data: invitedEmails = [], isLoading } = useInvitedEmailsQuery();
  const [tab, setTab] = useState<TabId>("direct");

  // Direct account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Invite by email
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["invited-emails"] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const onCreateAccount = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { toast.error("VUI LÒNG NHẬP EMAIL."); return; }
    if (!trimmedEmail.endsWith(`@${ADMIN_DOMAIN}`)) { toast.error(`CHỈ CHẤP NHẬN EMAIL @${ADMIN_DOMAIN}`); return; }
    if (password.length < 6) { toast.error("MẬT KHẨU PHẢI CÓ ÍT NHẤT 6 KÝ TỰ."); return; }

    setSubmitting(true);
    const response = await fetch("/api/admin/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail, password, display_name: displayName.trim() || undefined, role }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "KHÔNG THỂ TẠO TÀI KHOẢN.");
      return;
    }

    toast.success(`TẠO TÀI KHOẢN ${ROLE_LABELS[role] ?? role} THÀNH CÔNG.`);
    setEmail(""); setPassword(""); setDisplayName(""); setRole("user");
    await refresh();
  };

  const onSendInvite = async () => {
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) { toast.error("VUI LÒNG NHẬP EMAIL."); return; }

    setInviting(true);
    const response = await fetch("/api/admin/invited-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail }),
    });
    setInviting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "KHÔNG THỂ GỬI LỜI MỜI.");
      return;
    }

    const data = (await response.json()) as { emailDelivery?: { sent: boolean; configured: boolean; error?: string } };
    const delivery = data.emailDelivery;

    if (delivery?.sent) {
      toast.success(`Đã gửi lời mời đến ${trimmedEmail}`);
    } else if (delivery?.configured === false) {
      toast.warning("Lời mời đã lưu nhưng email chưa được cấu hình. Vào Cài đặt → Email để thiết lập SMTP.");
    } else {
      toast.warning(`Lời mời đã lưu nhưng gửi email thất bại: ${delivery?.error ?? "Lỗi không xác định"}`);
    }

    setInviteEmail("");
    await refresh();
  };

  const onDelete = async (id: string) => {
    setRemovingId(id);
    const response = await fetch("/api/admin/invited-emails", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRemovingId(null);
    if (!response.ok) { toast.error("KHÔNG THỂ XÓA."); return; }
    toast.success("ĐÃ XÓA THÀNH CÔNG.");
    await refresh();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-amber-400">QUẢN LÝ TÀI KHOẢN</p>
        <h3 className="font-heading text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
          TẠO TÀI KHOẢN THÀNH VIÊN
        </h3>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
        {([
          { id: "direct", icon: UserPlus, label: "Tạo trực tiếp" },
          { id: "invite", icon: Mail,     label: "Gửi email mời" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all",
              tab === id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Direct account creation */}
      {tab === "direct" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Chỉ chấp nhận email <code className="rounded bg-muted px-1">@{ADMIN_DOMAIN}</code> — admin đặt mật khẩu ngay.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`email@${ADMIN_DOMAIN}`}
              className="border-border bg-background text-foreground"
            />
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tên hiển thị (tuỳ chọn)"
              className="border-border bg-background text-foreground"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                className="border-border bg-background text-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Select value={role} onValueChange={(value) => setRole(value || "user")}>
              <SelectTrigger className="border-border bg-background text-foreground uppercase tracking-[0.08em]">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                <SelectItem value="admin">ADMIN — Quản trị hệ thống</SelectItem>
                <SelectItem value="manager">QUẢN LÝ — Quản lý nội dung</SelectItem>
                <SelectItem value="support">CSKH — Hỗ trợ khách hàng</SelectItem>
                <SelectItem value="user">NGƯỜI DÙNG — Xem nội dung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={onCreateAccount} disabled={submitting} className="rounded-xl w-full">
            <UserPlus className="mr-2 size-4" />
            {submitting ? "ĐANG TẠO..." : "TẠO TÀI KHOẢN"}
          </Button>
        </div>
      )}

      {/* Invite by email */}
      {tab === "invite" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-blue-600 dark:text-blue-400">Gửi link đăng ký qua email</p>
            <p>Người nhận sẽ nhận được link để tự tạo tài khoản và đặt mật khẩu. Cần cấu hình SMTP trong <strong>Cài đặt → Email</strong>.</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="border-border bg-background text-foreground"
              onKeyDown={(e) => e.key === "Enter" && onSendInvite()}
            />
            <Button type="button" onClick={onSendInvite} disabled={inviting} className="rounded-xl shrink-0 gap-1.5">
              <SendHorizonal className="size-3.5" />
              {inviting ? "Đang gửi..." : "Gửi mời"}
            </Button>
          </div>
        </div>
      )}

      {/* Pending invites */}
      {isLoading ? (
        <LoadingSpinner className="py-6" label="ĐANG TẢI..." />
      ) : invitedEmails.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Lời mời đang chờ ({invitedEmails.length})</p>
          </div>
          {invitedEmails.map((item) => {
            const expired = new Date(item.expires_at) < new Date();
            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", expired ? "bg-red-500/10" : "bg-amber-500/10")}>
                    {expired ? <AlertTriangle className="size-3.5 text-red-500" /> : <CheckCircle2 className="size-3.5 text-amber-500" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground text-sm">{item.email}</p>
                    <p className={cn("text-xs", expired ? "text-red-500" : "text-muted-foreground")}>
                      {expired ? "Đã hết hạn" : `Hết hạn ${new Date(item.expires_at).toLocaleString("vi-VN")}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border bg-background shrink-0"
                  disabled={removingId === item.id}
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  {removingId === item.id ? "Đang xóa..." : "Xóa"}
                </Button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
