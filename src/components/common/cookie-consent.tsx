"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck } from "lucide-react";

const KEY = "arex-cookie-consent";

type GtagFn = (...args: unknown[]) => void;

/**
 * Banner đồng ý cookie + Google Consent Mode v2.
 * Mặc định (đặt ở layout) mọi storage = denied. Khi người dùng bấm:
 *  · Đồng ý  → gtag consent update = granted (bật GA/Ads cá nhân hoá)
 *  · Từ chối → giữ denied (chỉ cookie thiết yếu)
 * Lựa chọn lưu ở localStorage nên lần sau không hỏi lại.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* ignore */ }
  }, []);

  const decide = (choice: "accepted" | "rejected") => {
    try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (typeof gtag === "function") {
      const v = choice === "accepted" ? "granted" : "denied";
      gtag("consent", "update", {
        ad_storage: v,
        ad_user_data: v,
        ad_personalization: v,
        analytics_storage: v,
      });
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Chấp thuận cookie"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[120] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cookie className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Arex Network dùng cookie 🍪</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Chúng tôi dùng cookie để phân tích lượt truy cập và cải thiện trải nghiệm. Bạn có thể từ chối cookie không thiết yếu.{" "}
            <Link href="/cookie-policy" className="font-medium text-primary underline-offset-2 hover:underline">
              Chính sách cookie
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Từ chối
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ShieldCheck className="size-3.5" /> Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
