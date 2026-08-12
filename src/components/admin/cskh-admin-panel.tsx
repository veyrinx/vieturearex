"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, RefreshCw, CheckCircle, MessageCircle, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import { usePolling } from "@/hooks/use-polling";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  display_name: string;
  status: string;
  last_message_at: string;
  created_at: string;
};

type SupportMessage = {
  id: string;
  sender_type: "user" | "admin";
  sender_name: string;
  content: string;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return `${Math.floor(diff / 86400)}d trước`;
}

export function CskhAdminPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support");
      if (res.ok) {
        const data = (await res.json()) as { sessions: Session[] };
        setSessions(data.sessions ?? []);
      }
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/support/session/${sid}/messages`);
      if (res.ok) {
        const data = (await res.json()) as { messages: SupportMessage[] };
        setMessages(data.messages ?? []);
      }
    } catch { /**/ }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    if (!selectedId) return;
    void fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  // Chỉ hỏi tin nhắn khi đang mở một phiên VÀ tab đang hiện.
  const pollMessages = useCallback(() => {
    if (selectedId) void fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);
  usePolling(pollMessages, selectedId ? 15_000 : null, { immediate: false });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: selectedId, content: reply.trim() }),
      });
      if (!res.ok) { toast.error("Không thể gửi phản hồi."); return; }
      setReply("");
      await fetchMessages(selectedId);
    } catch { toast.error("Lỗi mạng."); } finally { setSending(false); }
  };

  const closeSession = async (id: string) => {
    await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "closed" }),
    });
    toast.success("Đã đóng phiên hỗ trợ.");
    await fetchSessions();
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">
            Hỗ Trợ Khách Hàng (CSKH)
          </h1>
          <p className="text-sm text-muted-foreground">Quản lý và trả lời yêu cầu hỗ trợ của người dùng.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} className="gap-2 rounded-xl">
          <RefreshCw className="size-3.5" />
          Làm mới
        </Button>
      </div>

      <div className="grid h-[600px] gap-4 md:grid-cols-[280px_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Phiên ({sessions.filter((s) => s.status === "open").length} đang mở)
            </CardTitle>
          </CardHeader>
          {loading ? (
            <LoadingSpinner className="py-8" label="Đang tải..." />
          ) : sessions.length === 0 ? (
            <div className="flex-1">
              <EmptyState title="Chưa có yêu cầu" description="Chưa có người dùng nào liên hệ." />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition hover:bg-muted/50",
                    selectedId === s.id && "bg-primary/8 dark:bg-primary/12",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground line-clamp-1">{s.display_name}</span>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      s.status === "open" ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground",
                    )}>
                      {s.status === "open" ? "Mở" : "Đóng"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(s.last_message_at)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageCircle className="size-10 opacity-30" />
              <p className="text-sm">Chọn một phiên để xem tin nhắn</p>
            </div>
          ) : (
            <>
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{selected.display_name}</p>
                  <p className="text-xs text-muted-foreground">Bắt đầu {timeAgo(selected.created_at)}</p>
                </div>
                {selected.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closeSession(selected.id)}
                    className="gap-1.5 rounded-xl text-xs"
                  >
                    <CheckCircle className="size-3.5" />
                    Đóng phiên
                  </Button>
                )}
              </CardHeader>

              <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4 scrollbar-none">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">Chưa có tin nhắn.</p>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === "admin";
                    const isAi = isAdmin && msg.sender_name.startsWith("[AI]");
                    const displayName = isAi ? msg.sender_name.replace(/^\[AI\]\s*/, "") : msg.sender_name;
                    return (
                      <div key={msg.id} className={cn("flex flex-col gap-0.5", isAdmin ? "items-end" : "items-start")}>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          {isAi && (
                            <Bot className="size-3 text-violet-500" />
                          )}
                          {displayName}
                          {isAi && (
                            <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                              AI
                            </span>
                          )}
                        </span>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          isAi
                            ? "bg-violet-500/15 text-violet-900 dark:text-violet-100 rounded-tr-sm border border-violet-500/20"
                            : isAdmin
                              ? "bg-primary text-white dark:bg-amber-500 rounded-tr-sm"
                              : "bg-muted text-foreground rounded-tl-sm",
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selected.status === "open" ? (
                <div className="shrink-0 border-t border-border p-3">
                  <form onSubmit={(e) => { e.preventDefault(); void sendReply(); }} className="flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Nhập phản hồi..."
                      maxLength={500}
                      className="h-9 flex-1 rounded-xl text-sm"
                    />
                    <Button type="submit" size="icon" className="size-9 shrink-0 rounded-xl" disabled={!reply.trim() || sending}>
                      <Send className="size-4" />
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="shrink-0 border-t border-border px-4 py-3">
                  <p className="text-center text-xs text-muted-foreground">Phiên này đã được đóng.</p>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
