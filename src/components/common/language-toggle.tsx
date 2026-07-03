"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLangCookie, setLangCookie, type SiteLang } from "@/lib/utils/lang-cookie";

/**
 * VI ↔ EN switch shown in the navbar. Backed by Google Translate
 * (see <AutoTranslate/>), so it translates the whole page.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const [lang, setLang] = useState<SiteLang>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLang(getLangCookie() ?? "vi");
    setMounted(true);
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
      translate="no"
      title={lang === "vi" ? "Switch to English" : "Đổi sang tiếng Việt"}
      aria-label="Đổi ngôn ngữ"
      className={cn(
        "notranslate inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-black uppercase tracking-wider transition-colors",
        className,
      )}
    >
      <Languages className="size-4 shrink-0" />
      <span className="tabular-nums">{mounted ? (lang === "vi" ? "VI" : "EN") : "VI"}</span>
    </button>
  );
}
