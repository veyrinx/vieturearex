// Google Dịch NHÚNG TRONG TRANG (widget element.js + cookie `googtrans`).
//
// Trước đây site điều hướng sang proxy `*.translate.goog` của Google để dịch —
// cách đó đổi cả tên miền nên điều hướng client-side của Next bị vỡ ("không
// chuyển được trang", toàn lỗi). Nay dịch ngay trên CÙNG 1 URL của site: widget
// đọc cookie `googtrans=/vi/<đích>` và dịch tại chỗ, điều hướng vẫn bình thường.

/** "vi" = bản gốc. Còn lại là mã đích của Google Dịch. */
export type SiteLang = "vi" | (string & {});

export type LangOption = { code: SiteLang; label: string; flag: string };

export const SOURCE_LANG: SiteLang = "vi";

/** Ưu tiên các thị trường lớn của Free Fire, rồi tới ngôn ngữ phổ biến. */
export const LANGS: LangOption[] = [
  { code: "vi",    label: "Tiếng Việt",  flag: "🇻🇳" },
  { code: "en",    label: "English",     flag: "🇬🇧" },
  { code: "pt",    label: "Português",   flag: "🇧🇷" },
  { code: "id",    label: "Indonesia",   flag: "🇮🇩" },
  { code: "th",    label: "ไทย",          flag: "🇹🇭" },
  { code: "hi",    label: "हिन्दी",         flag: "🇮🇳" },
  { code: "es",    label: "Español",     flag: "🇪🇸" },
  { code: "ar",    label: "العربية",       flag: "🇸🇦" },
  { code: "zh-CN", label: "中文",         flag: "🇨🇳" },
  { code: "ko",    label: "한국어",        flag: "🇰🇷" },
  { code: "ja",    label: "日本語",        flag: "🇯🇵" },
  { code: "ru",    label: "Русский",     flag: "🇷🇺" },
  { code: "fr",    label: "Français",    flag: "🇫🇷" },
];

export function langOption(code: SiteLang): LangOption {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}

/** Danh sách mã ngôn ngữ đích cho widget (bỏ tiếng Việt gốc). */
export function includedLanguages(): string {
  return LANGS.filter((l) => l.code !== SOURCE_LANG).map((l) => l.code).join(",");
}

/** Đọc ngôn ngữ hiện tại từ cookie googtrans (dạng "/vi/en"). */
export function readCurrentLang(): SiteLang {
  if (typeof document === "undefined") return SOURCE_LANG;
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!m) return SOURCE_LANG;
  const to = decodeURIComponent(m[1]).split("/")[2];
  return to && LANGS.some((l) => l.code === to) ? to : SOURCE_LANG;
}

/** ".arexnetwork.site" để cookie áp cho mọi subdomain; null nếu là localhost. */
function rootDomain(host: string): string | null {
  const parts = host.split(".");
  if (parts.length < 2) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // IP
  return `.${parts.slice(-2).join(".")}`;
}

/**
 * Đặt ngôn ngữ dịch qua cookie `googtrans` (caller tự reload sau đó).
 * to = "vi" → xoá cookie để về bản gốc.
 */
export function applyLang(to: SiteLang): void {
  if (typeof document === "undefined") return;
  const root = rootDomain(location.hostname);
  const clear = to === SOURCE_LANG;
  const value = clear ? "" : `/${SOURCE_LANG}/${to}`;
  const tail = clear ? " expires=Thu, 01 Jan 1970 00:00:00 GMT;" : "";
  // Set cho cả host hiện tại lẫn tên miền gốc để widget luôn đọc được.
  document.cookie = `googtrans=${value}; path=/;${tail}`;
  if (root) document.cookie = `googtrans=${value}; path=/; domain=${root};${tail}`;
}
