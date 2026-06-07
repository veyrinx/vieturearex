"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

type Suggestion = { id: string; name: string; avatar: string | null };

type Props = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function getGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

/**
 * Hook to detect when caret is at an "@partial" trigger.
 * Returns { query, start } when triggered, null otherwise.
 */
function detectMentionTrigger(text: string, caret: number): { query: string; start: number } | null {
  if (caret === 0) return null;
  let i = caret - 1;
  let foundAt = -1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") { foundAt = i; break; }
    if (/[\s\n]/.test(ch)) return null;
    // Limit how far back we look
    if (caret - i > 40) return null;
    i--;
  }
  if (foundAt < 0) return null;
  // Must be at start OR preceded by whitespace
  if (foundAt > 0 && !/[\s\n]/.test(text[foundAt - 1])) return null;
  const query = text.slice(foundAt + 1, caret);
  return { query, start: foundAt };
}

export function MentionAutocomplete({ textareaRef, value, onChange }: Props) {
  const [trigger, setTrigger] = useState<{ query: string; start: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const fetchToken = useRef(0);

  // Detect trigger on selection / value change
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const update = () => {
      const caret = el.selectionStart ?? 0;
      const found = detectMentionTrigger(value, caret);
      setTrigger(found);
      if (found) {
        // Position dropdown near textarea
        const rect = el.getBoundingClientRect();
        setCoords({ left: rect.left, top: rect.bottom + window.scrollY + 4 });
      } else {
        setCoords(null);
      }
    };

    update();
    el.addEventListener("keyup", update);
    el.addEventListener("click", update);
    el.addEventListener("focus", update);
    return () => {
      el.removeEventListener("keyup", update);
      el.removeEventListener("click", update);
      el.removeEventListener("focus", update);
    };
  }, [textareaRef, value]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!trigger) {
      setSuggestions([]);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setActiveIdx(0);

    const t = setTimeout(() => {
      if (!trigger.query) {
        // No query yet — could show recents, but keep empty for now
        setSuggestions([]);
        setLoading(false);
        return;
      }
      fetch(`/api/user/lookup?q=${encodeURIComponent(trigger.query)}`)
        .then((r) => r.ok ? r.json() : { suggestions: [] })
        .then((d: { suggestions?: Suggestion[] }) => {
          if (token !== fetchToken.current) return;
          setSuggestions(d.suggestions ?? []);
        })
        .catch(() => setSuggestions([]))
        .finally(() => {
          if (token === fetchToken.current) setLoading(false);
        });
    }, 150);

    return () => clearTimeout(t);
  }, [trigger]);

  // Keyboard navigation
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !trigger || suggestions.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!trigger || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        const pick = suggestions[activeIdx];
        if (pick) {
          e.preventDefault();
          insertMention(pick);
        }
      } else if (e.key === "Escape") {
        setTrigger(null);
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [textareaRef, trigger, suggestions, activeIdx]);

  const insertMention = (user: Suggestion) => {
    if (!trigger) return;
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const before = value.slice(0, trigger.start);
    const after = value.slice(caret);
    const mentionText = `@${user.name} `;
    const next = before + mentionText + after;
    onChange(next);
    setTrigger(null);
    // Restore caret after insertion
    setTimeout(() => {
      if (!el) return;
      const newCaret = (before + mentionText).length;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    }, 0);
  };

  if (!trigger || !coords) return null;

  return (
    <div
      className="fixed z-[200] min-w-[240px] max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
      style={{ left: coords.left, top: coords.top }}
    >
      <div className="border-b border-border px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Gắn thẻ người dùng
        </span>
        {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>

      <div className="max-h-64 overflow-y-auto">
        {!loading && suggestions.length === 0 && trigger.query && (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            Không tìm thấy user &quot;{trigger.query}&quot;
          </p>
        )}
        {!trigger.query && (
          <p className="px-3 py-3 text-[11px] text-muted-foreground text-center">
            Nhập tên để tìm...
          </p>
        )}
        {suggestions.map((user, idx) => {
          const initial = (user.name ?? "?").charAt(0).toUpperCase();
          const isActive = idx === activeIdx;
          return (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isActive ? "bg-primary/10 dark:bg-amber-400/10" : "hover:bg-muted/40"
              }`}
            >
              <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill unoptimized className="object-cover" />
                ) : (
                  <div className={`flex size-full items-center justify-center bg-gradient-to-br ${getGradient(user.id)} text-[10px] font-black text-white`}>
                    {initial}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground truncate">{user.name}</span>
            </button>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="border-t border-border px-3 py-1.5">
          <p className="text-[9px] text-muted-foreground">
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> di chuyển ·
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono ml-1">Enter</kbd> chọn ·
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono ml-1">Esc</kbd> đóng
          </p>
        </div>
      )}
    </div>
  );
}
