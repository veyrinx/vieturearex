"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LANGS, buildLangUrl, canTranslate, currentLang, langOption, type SiteLang,
} from "@/lib/utils/translate-lang";

/**
 * Bộ chọn ngôn ngữ trên navbar. Điều hướng sang proxy translate.goog của Google
 * (widget nhúng cũ đã bị Google ngừng hỗ trợ — xem translate-lang.ts).
 */
export function LanguageToggle({ className, openUp }: { className?: string; openUp?: boolean }) {
  const [lang, setLang] = useState<SiteLang>("vi");
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(currentLang(location.hostname, location.search));
    setShow(canTranslate(location.hostname));
  }, []);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  // Ẩn khi chạy local/IP — Google không truy cập được site nội bộ.
  if (!show) return null;

  const cur = langOption(lang);

  return (
    <div ref={boxRef} className="relative" translate="no">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Đổi ngôn ngữ"
        title="Đổi ngôn ngữ"
        className={cn(
          "notranslate inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-black uppercase tracking-wider transition-colors",
          className,
        )}
      >
        <Languages className="size-4 shrink-0" />
        <span className="tabular-nums">{cur.code === "vi" ? "VI" : cur.code.slice(0, 2).toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            // z cao hơn Sheet để không bị nằm dưới lớp phủ.
            "absolute right-0 z-[60] max-h-[60vh] w-48 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl",
            openUp ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                role="option"
                aria-selected={active}
                onClick={() => { window.location.href = buildLangUrl(location, l.code); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active ? "bg-primary/10 font-bold text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1 truncate">{l.label}</span>
                {active && <Check className="size-3.5 shrink-0" />}
              </button>
            );
          })}
          <p className="px-2.5 py-1.5 text-[10px] leading-tight text-muted-foreground">
            Bản dịch do Google cung cấp, có thể chưa chuẩn.
          </p>
        </div>
      )}
    </div>
  );
}
