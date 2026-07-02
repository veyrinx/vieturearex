"use client";

import { useEffect } from "react";
import { setLangCookie, getLangCookie } from "@/lib/utils/lang-cookie";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement?: new (opts: unknown, id: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Loads the Google Translate engine once and auto-detects language.
 * - Default site language is Vietnamese.
 * - If the visitor's timezone is NOT Asia/Ho_Chi_Minh and they have not
 *   previously chosen a language, switch to English automatically.
 * The visible VI ↔ EN switch lives in the navbar (see <LanguageToggle/>).
 */
export function AutoTranslate() {
  useEffect(() => {
    // Auto-detect: non-Vietnam visitors default to English (first visit only)
    if (!getLangCookie()) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && tz !== "Asia/Ho_Chi_Minh" && !tz.startsWith("Asia/Saigon")) {
          setLangCookie("en");
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
            { pageLanguage: "vi", includedLanguages: "vi,en", autoDisplay: false },
            "google_translate_element",
          );
        } catch { /* ignore */ }
      };

      const s = document.createElement("script");
      s.id = "g-translate-script";
      s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  return null;
}
