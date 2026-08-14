"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const KEY = "arex-cookie-consent";

type GtagFn = (...args: unknown[]) => void;

const EU_COUNTRIES = new Set([
  // EU Member States
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA countries + UK & Switzerland (often subject to similar data laws)
  "GB", "IS", "LI", "NO", "CH",
]);

/**
 * Banner đồng ý cookie + Google Consent Mode v2.
 * Mặc định (đặt ở layout) mọi storage = denied. Khi người dùng bấm:
 *  · Đồng ý  → gtag consent update = granted (bật GA/Ads cá nhân hoá)
 *  · Từ chối → giữ denied (chỉ cookie thiết yếu)
 * Lựa chọn lưu ở localStorage nên lần sau không hỏi lại.
 */
// Bản dự phòng khi server không biết người dùng ở đâu: suy từ múi giờ của trình
// duyệt. Xảy ra khi thiếu header x-vercel-ip-country — chạy trên Render, hoặc
// bản triển khai đã ghim site nên không đọc header nữa (xem NEXT_PUBLIC_SITE_ID).
// Cố ý rộng hơn danh sách EU thật (dính cả Moscow, Istanbul): thà hiện banner
// cho người ngoài EU còn hơn bỏ sót người trong EU.
function looksEuropeanByTimezone(): boolean {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone?.startsWith("Europe/") ?? false;
  } catch {
    return false;
  }
}

export function CookieConsent({ country }: { country: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Nếu không phải người dùng EU, không làm gì cả.
    const inScope = country ? EU_COUNTRIES.has(country) : looksEuropeanByTimezone();
    if (!inScope) {
      return;
    }

    try {
      // Chỉ hiển thị nếu người dùng chưa đưa ra lựa chọn.
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* ignore */ }
  }, [country]);

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
    <motion.div
      role="dialog"
      aria-label="Chấp thuận cookie"
      aria-live="polite"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-0 z-[120] p-2 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-border bg-card/90 p-4 shadow-2xl backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 sm:flex-row sm:items-center sm:gap-5 sm:rounded-2xl sm:p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary sm:rounded-xl">
          <Cookie className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Arex Network dùng cookie 🍪</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Chúng tôi dùng cookie để phân tích lượt truy cập và cải thiện trải nghiệm. Bạn có thể từ chối cookie không thiết yếu.
            <Link href="/cookie-policy" className="ml-1 font-medium text-primary underline-offset-2 hover:underline">
              Chính sách cookie
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Từ chối
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)/40%)] transition-all hover:opacity-90 hover:shadow-[0_8px_24px_-10px_hsl(var(--primary)/60%)]"
          >
            <ShieldCheck className="size-3.5" /> Đồng ý
          </button>
        </div>
      </div>
    </motion.div>
  );
}
