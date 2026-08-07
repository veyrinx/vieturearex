"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, MessagesSquare, Send, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import type { ViewerParty } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  sender_id: string | null;
  sender_role: "buyer" | "seller" | "agent" | "admin" | "system";
  body: string;
  images: string[];
  flagged: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<ChatMessage["sender_role"], string> = {
  buyer: "Người mua",
  seller: "Người bán",
  agent: "Giao dịch viên",
  admin: "Quản trị viên",
  system: "Hệ thống",
};

const ROLE_TONE: Record<ChatMessage["sender_role"], string> = {
  buyer: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  seller: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  agent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  admin: "bg-red-500/10 text-red-500",
  system: "bg-muted text-muted-foreground",
};

/**
 * Hộp thoại ba bên trong một đơn.
 *
 * Đơn còn chạy thì tự nạp lại 15 giây/lần — cùng nhịp với màn hình đơn, đủ
 * nhanh cho một cuộc trao đổi mà không cần mở socket riêng.
 */
export function OrderChat({
  code,
  party,
  closed,
}: {
  code: string;
  party: ViewerParty;
  closed: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shop/orders/${code}/messages`);
      if (!res.ok) return;
      const d = (await res.json()) as { messages?: ChatMessage[] };
      setMessages(d.messages ?? []);
    } finally {
      setLoaded(true);
    }
  }, [code]);

  useEffect(() => {
    void load();
    if (closed) return;
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [load, closed]);

  // Chỉ tự cuộn khi người dùng đang ở đáy — đang đọc lại lịch sử thì để yên.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!text.trim() && images.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/shop/orders/${code}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, images }),
      });
      const d = (await res.json()) as { error?: string; filtered?: boolean };
      if (!res.ok) {
        toast.error(d.error ?? "Không gửi được tin nhắn.");
        return;
      }
      if (d.filtered) {
        toast.warning("Một phần nội dung đã bị ẩn (số điện thoại / link ngoài).");
      }
      setText("");
      setImages([]);
      setShowPicker(false);
      stickToBottom.current = true;
      await load();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-foreground">
          <MessagesSquare className="size-4 text-primary dark:text-amber-400" />
          Trao đổi trong đơn
        </p>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {messages.length} tin nhắn
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="max-h-[26rem] space-y-2.5 overflow-y-auto p-4"
      >
        {!loaded && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            <Loader2 className="mx-auto size-4 animate-spin" />
          </p>
        )}

        {loaded && messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Chưa có tin nhắn nào. Hỏi giao dịch viên nếu bạn chưa rõ bước tiếp theo.
          </p>
        )}

        {messages.map((m) => {
          const mine = m.sender_role === party && m.sender_role !== "system";
          if (m.sender_role === "system") {
            return (
              <p
                key={m.id}
                className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground"
              >
                {m.body}
              </p>
            );
          }
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] space-y-1", mine && "items-end text-right")}>
                <p className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn("rounded-full px-1.5 py-0.5 font-black uppercase", ROLE_TONE[m.sender_role])}>
                    {ROLE_LABEL[m.sender_role]}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </p>

                {m.body && (
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      mine
                        ? "bg-primary text-white dark:bg-amber-500"
                        : "bg-muted/60 text-foreground",
                    )}
                  >
                    {m.body}
                  </p>
                )}

                {m.images.length > 0 && (
                  <div className={cn("flex flex-wrap gap-1.5", mine && "justify-end")}>
                    {m.images.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative size-20 overflow-hidden rounded-lg border border-border"
                      >
                        <Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {closed ? (
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          Đơn đã đóng — hộp thoại chỉ còn để đọc lại.
        </p>
      ) : (
        <div className="space-y-2 border-t border-border p-3">
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            Số điện thoại, link ngoài và số tài khoản sẽ bị ẩn tự động. Mọi giao dịch nằm ngoài đơn
            này Arex không bảo vệ được.
          </p>

          {showPicker && (
            <ImagePicker
              value={images}
              onChange={setImages}
              max={4}
              hint="Ảnh gửi trong hộp thoại lưu ở kho kín, chỉ người trong đơn mở được."
            />
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                "rounded-xl border p-2.5 transition",
                showPicker
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:border-primary/30",
              )}
              aria-label={showPicker ? "Đóng chọn ảnh" : "Gửi ảnh"}
            >
              {showPicker ? <X className="size-4" /> : <ImageIcon className="size-4" />}
            </button>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Nhắn cho giao dịch viên / bên còn lại…"
              className="max-h-24 min-h-[2.6rem] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            <button
              onClick={() => void send()}
              disabled={sending || (!text.trim() && images.length === 0)}
              className="rounded-xl bg-primary p-2.5 text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-amber-500"
              aria-label="Gửi"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
