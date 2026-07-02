"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getLangCookie, setLangCookie, type SiteLang } from "@/lib/utils/lang-cookie";

/**
 * VI ↔ EN switch shown in the navbar. Backed by Google Translate
 * (see <AutoTranslate/>), so it translates the whole page.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const [lang, setLang] = useState<SiteLang>("vi");

  useEffect(() => {
    setLang(getLangCookie() ?? "vi");
  }, []);

  const toggle = () => {
    const next: SiteLang = lang === "vi" ? "en" : "vi";
    setLangCookie(next);
    setLang(next);
    // Reload so Google Translate re-applies the new cookie to the whole page.
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={lang === "vi" ? "Switch to English" : "Đổi sang tiếng Việt"}
      aria-label="Đổi ngôn ngữ"
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black uppercase tracking-wider transition-colors",
        className,
      )}
    >
      {/* Current language highlighted */}
      <span className={lang === "vi" ? "text-primary dark:text-amber-400" : "opacity-40"}>VI</span>
      <span className="opacity-30">/</span>
      <span className={lang === "en" ? "text-primary dark:text-amber-400" : "opacity-40"}>EN</span>
    </button>
  );
}
