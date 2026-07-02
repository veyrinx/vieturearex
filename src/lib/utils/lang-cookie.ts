// Shared helpers for the Google Translate language cookie (googtrans).
// Site source language is Vietnamese; only vi <-> en are supported.

const COOKIE_NAME = "googtrans";

export type SiteLang = "vi" | "en";

export function setLangCookie(lang: SiteLang) {
  if (typeof document === "undefined") return;
  const value = lang === "en" ? "/vi/en" : "/vi/vi";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${location.hostname}; max-age=${60 * 60 * 24 * 365}`;
}

export function getLangCookie(): SiteLang | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]);
  if (val.includes("/vi/en")) return "en";
  if (val.includes("/vi/vi")) return "vi";
  return null;
}
