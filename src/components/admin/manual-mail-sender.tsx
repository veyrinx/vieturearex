"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Soạn & gửi email thủ công tới 1 hoặc nhiều người — ngoài các email tự động. */
export function ManualMailSender() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error("Nhập đủ người nhận, tiêu đề và nội dung.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          ...(ctaLabel.trim() && ctaUrl.trim()
            ? { cta_label: ctaLabel.trim(), cta_url: ctaUrl.trim() }
            : {}),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; sent?: number; total?: number; error?: string; errors?: string[];
      };
      if (res.ok && d.ok) {
        toast.success(`Đã gửi ${d.sent}/${d.total} email.${d.errors?.length ? " Vài email lỗi — xem lại địa chỉ." : ""}`);
        setTo(""); setSubject(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      } else {
        toast.error(d.error || d.errors?.[0] || "Gửi thất bại. Kiểm tra cấu hình SMTP.");
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Người nhận</label>
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="email@vd.com — nhiều người cách nhau bởi dấu phẩy"
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tiêu đề</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tiêu đề email" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nội dung</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Nội dung email (xuống dòng để tách đoạn). Dùng khung thương hiệu + banner như email hệ thống."
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nút CTA — nhãn (tuỳ chọn)</label>
          <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="VD: Xem chi tiết" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nút CTA — link (tuỳ chọn)</label>
          <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." className="font-mono text-xs" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground/70">Tối đa 50 người nhận mỗi lần. Dùng đúng SMTP đã cấu hình ở trên.</p>
        <Button type="button" onClick={() => void send()} disabled={sending} className="shrink-0 gap-1.5">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {sending ? "Đang gửi..." : "Gửi email"}
        </Button>
      </div>
    </div>
  );
}
