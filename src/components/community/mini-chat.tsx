"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircle, Send, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};

const STORAGE_KEY = "arex_community_chat";
const MAX_MESSAGES = 100;

function loadMessages(): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
}

function getUsername(): string {
  try {
    return localStorage.getItem("arex_chat_name") || "Ẩn danh";
  } catch {
    return "Ẩn danh";
  }
}

const BANNED_WORDS = [
  "cá độ", "cá cược", "đánh bài", "casino", "slot", "xổ số", "lô đề",
  "kèo", "tỷ lệ cược", "nhà cái", "betting", "gamble", "gambling",
  "soi kèo", "chơi bài", "đặt cược",
];

function containsBannedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

export function MiniCommunityChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [editingName, setEditingName] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
    setUsername(getUsername());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    if (containsBannedContent(text)) {
      setInput("");
      return;
    }

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: username || "Ẩn danh",
      text,
      timestamp: Date.now(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput("");
  };

  const saveName = (name: string) => {
    const clean = name.trim().slice(0, 20) || "Ẩn danh";
    setUsername(clean);
    localStorage.setItem("arex_chat_name", clean);
    setEditingName(false);
  };

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
          >
            <MessageCircle className="size-6" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {Math.min(messages.length, 99)}
              </span>
            )}
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
            className="fixed bottom-6 right-6 z-50 flex h-[480px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_64px_rgba(2,6,23,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-4 py-3 dark:from-amber-400/8">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary dark:text-amber-400" />
                <span className="font-heading text-sm font-bold uppercase text-foreground">CỘNG ĐỒNG</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition">
                <X className="size-4" />
              </button>
            </div>

            {/* Anti-gambling notice */}
            <div className="border-b border-border bg-red-500/5 px-3 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                ⚠ NGHIÊM CẤM CÁ ĐỘ, CÁ CƯỢC, QUẢNG CÁO GAME BẤT HỢP PHÁP
              </p>
            </div>

            {/* Username bar */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              {editingName ? (
                <Input
                  autoFocus
                  defaultValue={username}
                  maxLength={20}
                  placeholder="Tên của bạn"
                  className="h-7 text-xs"
                  onBlur={(e) => saveName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName((e.target as HTMLInputElement).value); }}
                />
              ) : (
                <button type="button" onClick={() => setEditingName(true)} className="text-xs text-muted-foreground hover:text-foreground transition">
                  Tên: <span className="font-semibold text-foreground">{username}</span> ✎
                </button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-none">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.sender === username ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] font-semibold text-muted-foreground">{msg.sender}</span>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender === username
                        ? "bg-primary text-white dark:bg-amber-500"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={300}
                  className="h-9 flex-1 rounded-xl text-sm"
                />
                <Button type="submit" size="icon" className="size-9 shrink-0 rounded-xl" disabled={!input.trim()}>
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
