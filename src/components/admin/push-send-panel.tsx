"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PushSendPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState<{ sent: number; total: number } | null>(null);

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error("Nhập tiêu đề và nội dung.");
      return;
    }
    if (!confirm(`Gửi thông báo đẩy tới tất cả người đã bật?\n\n${title}`)) return;
    setSending(true);
    setLast(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Gửi thất bại.");
        return;
      }
      if (json.total === 0 || json.sent == null) {
        toast.info(json.message ?? "Chưa có ai bật thông báo.");
        setLast({ sent: json.sent ?? 0, total: json.total ?? 0 });
        return;
      }
      setLast({ sent: json.sent, total: json.total });
      toast.success(`Đã gửi tới ${json.sent}/${json.total} thiết bị.`);
      setTitle("");
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BellRing className="size-4" />
        </span>
        <div>
          <h2 className="font-heading text-sm font-black uppercase tracking-widest text-foreground">
            Gửi thông báo đẩy (Web Push)
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Hiện thông báo trên trình duyệt/điện thoại của người đã bật — kể cả khi không mở web.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề (vd: Có code mới!)" maxLength={80} className="bg-background" />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nội dung ngắn gọn..."
          rows={2}
          maxLength={200}
          className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
        />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link mở khi bấm (vd: /giftcode)" className="bg-background font-mono text-xs" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={send} disabled={sending} className="gap-2 rounded-xl">
          <Send className="size-4" /> {sending ? "Đang gửi..." : "Gửi thông báo đẩy"}
        </Button>
        {last && (
          <span className="text-xs text-muted-foreground">
            Lần gửi gần nhất: <b className="text-foreground">{last.sent}</b>/{last.total} thiết bị
          </span>
        )}
      </div>

      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
        Cần cấu hình VAPID keys (biến môi trường <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>,{" "}
        <code className="font-mono">VAPID_PRIVATE_KEY</code>) mới gửi được. Người dùng bật thông báo bằng nút chuông trên thanh điều hướng.
      </p>
    </div>
  );
}
