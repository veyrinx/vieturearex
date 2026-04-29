"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const COOKIE_NAME = "googtrans";

function setLangCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  // Some setups also need cookie at parent domain
  document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${location.hostname}; max-age=${60 * 60 * 24 * 365}`;
}

function getLangCookie(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

declare global {
  interface Window {
    google?: { translate?: { TranslateElement?: new (opts: unknown, id: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Auto-translate widget powered by Google Translate.
 * - Default site language is Vietnamese.
 * - If the visitor's timezone is NOT Asia/Ho_Chi_Minh and they have not
 *   previously chosen a language, switch to English automatically.
 * - A small floating toggle button lets anyone flip VI ↔ EN.
 */
export function AutoTranslate() {
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Decide initial language
    const cookie = getLangCookie();
    if (cookie?.includes("/vi/en")) {
      setLang("en");
    } else if (cookie?.includes("/vi/vi") || cookie === "/vi/vi") {
      setLang("vi");
    } else {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && tz !== "Asia/Ho_Chi_Minh" && !tz.startsWith("Asia/Saigon")) {
          setLangCookie("/vi/en");
          setLang("en");
        }
      } catch { /* ignore */ }
    }

    // Inject Google Translate script once
    if (!document.getElementById("g-translate-script")) {
      const container = document.createElement("div");
      container.id = "google_translate_element";
      container.style.display = "none";
      document.body.appendChild(container);

      window.googleTranslateElementInit = () => {
        try {
          new window.google!.translate!.TranslateElement!(
            {
              pageLanguage: "vi",
              includedLanguages: "vi,en",
              autoDisplay: false,
            },
            "google_translate_element",
          );
          setReady(true);
        } catch { /* ignore */ }
      };

      const s = document.createElement("script");
      s.id = "g-translate-script";
      s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    } else {
      setReady(true);
    }
  }, []);

  const toggle = () => {
    const next = lang === "vi" ? "en" : "vi";
    setLangCookie(next === "en" ? "/vi/en" : "/vi/vi");
    setLang(next);
    // Easiest reliable way to apply cookie change: full reload.
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={lang === "vi" ? "Switch to English" : "Đổi sang tiếng Việt"}
      aria-label="Toggle language"
      className={cn(
        "fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md transition hover:border-primary/40 hover:bg-card",
        !ready && "opacity-70",
      )}
    >
      <Globe className="size-3.5" />
      {lang === "vi" ? "EN" : "VI"}
    </button>
  );
}
