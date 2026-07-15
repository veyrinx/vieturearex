"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send, Check } from "lucide-react";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Đăng ký thất bại.");
        return;
      }
      setDone(true);
      setEmail("");
      toast.success("Đã đăng ký! Cảm ơn bạn.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <Check className="size-4" /> Đã đăng ký nhận tin — hẹn gặp trong hộp thư!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email của bạn..."
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send className="size-4" /> {sending ? "Đang gửi..." : "Đăng ký"}
      </button>
    </form>
  );
}
