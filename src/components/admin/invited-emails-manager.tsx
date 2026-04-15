"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Eye, EyeOff } from "lucide-react";
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

const ROLE_LABELS: Record<string, string> = {
  admin: "ADMIN",
  manager: "QUẢN LÝ",
  support: "CSKH",
  user: "NGƯỜI DÙNG",
};

export function InvitedEmailsManager() {
  const queryClient = useQueryClient();
  const { data: invitedEmails = [], isLoading } = useInvitedEmailsQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["invited-emails"] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const onCreateAccount = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("VUI LÒNG NHẬP EMAIL.");
      return;
    }
    if (!trimmedEmail.endsWith("@arex.tech")) {
      toast.error("CHỈ CHẤP NHẬN EMAIL @arex.tech");
      return;
    }
    if (password.length < 6) {
      toast.error("MẬT KHẨU PHẢI CÓ ÍT NHẤT 6 KÝ TỰ.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/admin/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        display_name: displayName.trim() || undefined,
        role,
      }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "KHÔNG THỂ TẠO TÀI KHOẢN.");
      return;
    }

    toast.success(`TẠO TÀI KHOẢN ${ROLE_LABELS[role]} THÀNH CÔNG.`);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("user");
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

    if (!response.ok) {
      toast.error("KHÔNG THỂ XÓA.");
      return;
    }

    toast.success("ĐÃ XÓA THÀNH CÔNG.");
    await refresh();
  };

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-5 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-amber-400">TẠO TÀI KHOẢN MỚI</p>
        <h3 className="font-heading text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
          SUPER ADMIN TẠO TÀI KHOẢN CHO THÀNH VIÊN
        </h3>
        <p className="text-sm text-muted-foreground">
          CHỈ CHẤP NHẬN EMAIL @arex.tech — CHỌN VAI TRÒ PHÙ HỢP CHO TỪNG THÀNH VIÊN.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@arex.tech"
            className="border-border bg-background text-foreground"
          />
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="TÊN HIỂN THỊ (VD: Nguyễn Văn A)"
            className="border-border bg-background text-foreground"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="MẬT KHẨU (TỐI THIỂU 6 KÝ TỰ)"
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
              <SelectValue placeholder="CHỌN VAI TRÒ" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-foreground">
              <SelectItem value="admin" className="uppercase tracking-[0.08em]">
                ADMIN — Quản trị hệ thống
              </SelectItem>
              <SelectItem value="manager" className="uppercase tracking-[0.08em]">
                QUẢN LÝ — Quản lý nội dung
              </SelectItem>
              <SelectItem value="support" className="uppercase tracking-[0.08em]">
                CSKH — Hỗ trợ khách hàng
              </SelectItem>
              <SelectItem value="user" className="uppercase tracking-[0.08em]">
                NGƯỜI DÙNG — Xem nội dung
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={onCreateAccount} disabled={submitting} className="rounded-xl w-full">
          <UserPlus className="mr-2 size-4" />
          {submitting ? "ĐANG TẠO..." : "TẠO TÀI KHOẢN"}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-8" label="ĐANG TẢI..." />
      ) : invitedEmails.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">LỜI MỜI ĐANG CHỜ</p>
          {invitedEmails.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background/80 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-foreground">{item.email}</p>
                <p className="text-sm text-muted-foreground">
                  HẾT HẠN {new Date(item.expires_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border bg-background"
                disabled={removingId === item.id}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="mr-2 size-4" />
                {removingId === item.id ? "ĐANG XÓA..." : "XÓA"}
              </Button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
