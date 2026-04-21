"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headset, Send, X, Star, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────
type SupportMessage = {
  id: string;
  sender_type: "user" | "admin";
  sender_name: string;
  content: string;
  created_at: string;
};

type Panel = "home" | "chat" | "rating";

// ── Storage helpers ────────────────────────────────────
function getAnonId(): string {
  try {
    const key = "cskh_anon_id";
    const v = localStorage.getItem(key);
    if (v) return v;
    const id = "KH_" + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem(key, id);
    return id;
  } catch { return "KH_ANON"; }
}

function getSessionId(): string | null {
  try { return localStorage.getItem("cskh_session_id"); } catch { return null; }
}

function saveSessionId(id: string) {
  try { localStorage.setItem("cskh_session_id", id); } catch { /**/ }
}

function getAnonRatingId(): string {
  try {
    const key = "vt_anon_id";
    const v = localStorage.getItem(key);
    if (v) return v;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const id = "User #" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    localStorage.setItem(key, id);
    return id;
  } catch { return "User #ANON"; }
}

const BANNED_WORDS = [
  "cá độ", "cá cược", "đánh bài", "casino", "slot", "xổ số", "lô đề",
  "kèo", "tỷ lệ cược", "nhà cái", "betting", "gamble", "gambling",
];

function containsBanned(text: string) {
  return BANNED_WORDS.some((w) => text.toLowerCase().includes(w));
}

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"];

// ── Main component ─────────────────────────────────────
export function CskhChat() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("home");

  // Chat state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rating state
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [review, setReview] = useState("");
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Load persisted state
  useEffect(() => {
    try {
      const name = localStorage.getItem("cskh_display_name") || "";
      setUsername(name);
      setSessionId(getSessionId());
    } catch { /**/ }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Poll for new messages while chat panel is open
  const fetchMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/support/session/${sid}/messages`);
      if (res.ok) {
        const data = (await res.json()) as { messages: SupportMessage[] };
        setMessages(data.messages ?? []);
      }
    } catch { /**/ }
  }, []);

  useEffect(() => {
    if (panel === "chat" && sessionId) {
      fetchMessages(sessionId);
      pollRef.current = setInterval(() => { void fetchMessages(sessionId); }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [panel, sessionId, fetchMessages]);

  // ── Helpers ──────────────────────────────────────────
  const saveName = (name: string) => {
    const clean = name.trim().slice(0, 30) || "Khách";
    setUsername(clean);
    try { localStorage.setItem("cskh_display_name", clean); } catch { /**/ }
    setEditingName(false);
  };

  const startChat = async () => {
    const name = username.trim() || "Khách";
    const anonId = getAnonId();
    setChatLoading(true);

    let sid = getSessionId();
    if (!sid) {
      try {
        const res = await fetch("/api/support/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: name, anonymous_id: anonId }),
        });
        if (res.ok || res.status === 201) {
          const data = (await res.json()) as { session_id?: string };
          sid = data.session_id ?? null;
          if (sid) saveSessionId(sid);
        }
      } catch { /**/ }
    }

    if (sid) {
      setSessionId(sid);
      await fetchMessages(sid);
    }
    setChatLoading(false);
    setPanel("chat");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    if (containsBanned(text)) { setInput(""); return; }

    setInput("");
    const name = username || "Khách";

    // Optimistic update
    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`,
      sender_type: "user",
      sender_name: name,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch(`/api/support/session/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sender_name: name, anonymous_id: getAnonId() }),
      });
      await fetchMessages(sessionId);
    } catch { /**/ }
  };

  const submitRating = async () => {
    if (!selectedStar) return;
    setRatingSubmitting(true);
    try {
      const anonId = getAnonRatingId();
      await fetch("/api/news/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "__website__",
          title: "Đánh giá website Arex",
          anonymous_id: anonId,
          stars: selectedStar,
          review: review.trim() || null,
        }),
      });
      setRatingDone(true);
      toast.success("Cảm ơn bạn đã đánh giá!");
    } catch {
      toast.error("Không thể gửi đánh giá. Thử lại sau.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const displayStar = hoveredStar || selectedStar;

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_30px_rgba(0,82,255,0.3)] transition-transform hover:scale-105 dark:bg-amber-500 dark:shadow-[0_8px_30px_rgba(247,147,26,0.3)]"
            aria-label="Mở CSKH"
          >
            <Headset className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[360px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_64px_rgba(2,6,23,0.18)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3 dark:from-amber-400/10">
              <div className="flex items-center gap-2">
                {panel !== "home" && (
                  <button
                    type="button"
                    onClick={() => setPanel("home")}
                    className="mr-1 rounded-lg p-1 text-muted-foreground hover:bg-muted transition"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                )}
                <Headset className="size-4 text-primary dark:text-amber-400" />
                <span className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  {panel === "rating" ? "ĐÁNH GIÁ WEBSITE" : "CSKH AREX"}
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition">
                <X className="size-4" />
              </button>
            </div>

            {/* Home screen */}
            {panel === "home" && (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <p className="text-sm text-muted-foreground">Chào bạn! Chúng tôi có thể giúp gì cho bạn?</p>

                {/* Name bar */}
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
                  {editingName ? (
                    <Input
                      autoFocus
                      defaultValue={username}
                      maxLength={30}
                      placeholder="Tên của bạn"
                      className="h-7 flex-1 text-xs"
                      onBlur={(e) => saveName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveName((e.target as HTMLInputElement).value); }}
                    />
                  ) : (
                    <button type="button" onClick={() => setEditingName(true)} className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition">
                      Tên: <span className="font-semibold text-foreground">{username || "Khách"}</span> ✎
                    </button>
                  )}
                </div>

                <Button
                  onClick={startChat}
                  disabled={chatLoading}
                  className="w-full rounded-xl gap-2"
                >
                  <Headset className="size-4" />
                  {chatLoading ? "Đang kết nối..." : "Chat với hỗ trợ viên"}
                </Button>

                <button
                  type="button"
                  onClick={() => setPanel("rating")}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex items-center gap-2">
                    <Star className="size-4 text-yellow-400" />
                    Đánh giá website
                  </span>
                  <span className="text-xs text-muted-foreground">★★★★★</span>
                </button>

                <div className="mt-auto rounded-xl border border-border bg-red-500/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    ⚠ NGHIÊM CẤM CÁ ĐỘ, CÁ CƯỢC, QUẢNG CÁO GAME BẤT HỢP PHÁP
                  </p>
                </div>
              </div>
            )}

            {/* Chat panel */}
            {panel === "chat" && (
              <>
                <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3 scrollbar-none">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-xs text-muted-foreground">
                        Hãy gửi tin nhắn để bắt đầu. Hỗ trợ viên sẽ phản hồi sớm nhất có thể.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = msg.sender_type === "admin";
                      return (
                        <div key={msg.id} className={cn("flex flex-col gap-0.5", isAdmin ? "items-start" : "items-end")}>
                          <span className="text-[10px] font-semibold text-muted-foreground">{msg.sender_name}</span>
                          <div className={cn(
                            "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                            isAdmin
                              ? "bg-muted text-foreground rounded-tl-sm"
                              : "bg-primary text-white dark:bg-amber-500 rounded-tr-sm",
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="shrink-0 border-t border-border p-3">
                  <form onSubmit={(e) => { e.preventDefault(); void sendMessage(); }} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      maxLength={500}
                      className="h-9 flex-1 rounded-xl text-sm"
                    />
                    <Button type="submit" size="icon" className="size-9 shrink-0 rounded-xl" disabled={!input.trim()}>
                      <Send className="size-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* Rating panel */}
            {panel === "rating" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
                {ratingDone ? (
                  <div className="space-y-2 text-center">
                    <div className="text-4xl">🎉</div>
                    <p className="font-heading font-bold uppercase tracking-[0.08em] text-foreground">Cảm ơn bạn!</p>
                    <p className="text-sm text-muted-foreground">Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 text-center">
                      <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                        Bạn cảm thấy thế nào về website?
                      </p>
                      {displayStar > 0 && (
                        <p className="text-xs font-semibold text-primary dark:text-amber-400">{STAR_LABELS[displayStar]}</p>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          onClick={() => setSelectedStar(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={32}
                            className={cn(
                              "transition-colors",
                              star <= displayStar ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
                            )}
                          />
                        </button>
                      ))}
                    </div>

                    <Textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Nhận xét thêm (không bắt buộc)..."
                      rows={3}
                      maxLength={500}
                      className="w-full resize-none text-sm"
                    />

                    <Button
                      onClick={submitRating}
                      disabled={!selectedStar || ratingSubmitting}
                      className="w-full rounded-xl"
                    >
                      {ratingSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
