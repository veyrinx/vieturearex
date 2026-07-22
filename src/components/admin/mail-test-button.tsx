"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Nút gửi email thử — kiểm tra cấu hình SMTP/Gmail ngay trong admin. */
export function MailTestButton() {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to.trim() ? { to: to.trim() } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; to?: string; error?: string };
      if (res.ok && data.ok) toast.success(`Đã gửi email thử tới ${data.to}. Kiểm tra hộp thư (cả mục Spam).`);
      else toast.error(data.error || "Gửi thất bại. Kiểm tra lại cấu hình SMTP.");
    } catch {
      toast.error("Lỗi kết nối khi gửi email thử.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Email nhận thử (bỏ trống = gửi cho chính người gửi)"
        className="flex-1 min-w-56 font-mono text-sm"
      />
      <Button type="button" onClick={() => void send()} disabled={sending} className="gap-1.5">
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {sending ? "Đang gửi..." : "Gửi thử"}
      </Button>
    </div>
  );
}
