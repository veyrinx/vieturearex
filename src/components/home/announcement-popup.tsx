"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "vt_popup_dismissed";
const DISMISS_DURATION_MS = 3 * 60 * 60 * 1000; // 3 giờ

type Props = { title: string; content: string; imageUrl?: string; linkUrl?: string };

export function AnnouncementPopup({ title, content, imageUrl, linkUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Kiểm tra đã đóng trong 3 giờ chưa
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const dismissedAt = Number(dismissed);
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
      }
    } catch { /* ignore */ }

    setMounted(true);
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setMounted(false), 480);
  };

  const handleDismiss3h = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setClosing(true);
    setTimeout(() => setMounted(false), 480);
  };

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(circle at top, rgba(0,82,255,0.18), rgba(0,0,0,0.78) 42%)",
        backdropFilter: "blur(10px)",
        opacity: visible && !closing ? 1 : 0,
        transition: "opacity 0.42s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div
        style={{
          transform: visible && !closing ? "scale(1) translateY(0)" : "scale(0.94) translateY(20px)",
          opacity: visible && !closing ? 1 : 0,
          filter: visible && !closing ? "blur(0px)" : "blur(10px)",
          transition: "transform 0.48s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease-out, filter 0.38s ease-out",
        }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2
            className="font-heading text-lg font-bold uppercase text-foreground text-center flex-1"
            dangerouslySetInnerHTML={{ __html: title || "THÔNG BÁO" }}
          />
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image (optional) */}
        {imageUrl && (
          <div className="border-b border-border bg-muted/20">
            {linkUrl ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={title || "Thông báo"} className="max-h-72 w-full object-cover" />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={title || "Thông báo"} className="max-h-72 w-full object-cover" />
            )}
          </div>
        )}

        {/* Content */}
        <div
          className="max-h-[60vh] overflow-y-auto px-5 py-4 popup-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-[10px] pb-[10px] pt-[10px]">
          <button
            type="button"
            onClick={handleDismiss3h}
            className="rounded-lg bg-primary px-6 py-2 text-center text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-[0_10px_26px_rgba(0,82,255,0.22)] transition hover:brightness-110 dark:shadow-[0_12px_28px_rgba(247,147,26,0.22)]"
          >
            ĐÓNG 3 GIỜ
          </button>
        </div>
      </div>
    </div>
  );
}
