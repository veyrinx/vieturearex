// Chuyển ngữ qua proxy translate.goog của Google — hỗ trợ nhiều ngôn ngữ.
//
// Widget nhúng cũ (translate_a/element.js + cookie googtrans) đã bị Google ngừng
// hỗ trợ: script tĩnh vẫn tải được nhưng lời gọi translate_a/t trả 400/403 nên
// trang không bao giờ được dịch. Proxy translate.goog vẫn sống vì request dịch
// xuất phát từ chính domain của Google — đây là hạ tầng translate.google.com dùng.

/** "vi" = bản gốc (không qua proxy). Còn lại là mã đích của Google Dịch. */
export type SiteLang = "vi" | (string & {});

export type LangOption = { code: SiteLang; label: string; flag: string };

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

const SUFFIX = ".translate.goog";

/** arexnetwork.site -> arexnetwork-site.translate.goog (nhân đôi "-" trước). */
export function toTranslateHost(host: string): string {
  return `${host.replace(/-/g, "--").replace(/\./g, "-")}${SUFFIX}`;
}

/** arexnetwork-site.translate.goog -> arexnetwork.site */
export function fromTranslateHost(host: string): string {
  return host.slice(0, -SUFFIX.length).split("--").map((p) => p.replace(/-/g, ".")).join("-");
}

export function isTranslated(host: string): boolean {
  return host.endsWith(SUFFIX);
}

/** Ngôn ngữ hiện tại: đọc từ hostname + tham số _x_tr_tl, không cần cookie. */
export function currentLang(host: string, search: string): SiteLang {
  if (!isTranslated(host)) return "vi";
  const tl = new URLSearchParams(search).get("_x_tr_tl");
  return tl && LANGS.some((l) => l.code === tl) ? tl : "en";
}

export function langOption(code: SiteLang): LangOption {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}

/**
 * Không dùng được trên localhost/IP nội bộ vì Google phải truy cập được site.
 * Trả false để UI ẩn nút thay vì điều hướng tới trang lỗi.
 */
export function canTranslate(host: string): boolean {
  if (isTranslated(host)) return true;
  if (!host.includes(".")) return false; // localhost
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IP
  return !/\.local$/.test(host);
}

/** URL đích khi đổi ngôn ngữ, giữ nguyên đường dẫn + query + hash hiện tại. */
export function buildLangUrl(loc: Location, to: SiteLang): string {
  const base = isTranslated(loc.hostname) ? fromTranslateHost(loc.hostname) : loc.hostname;

  // Bỏ tham số riêng của proxy khỏi query gốc để không bị nhân bản.
  const params = new URLSearchParams(loc.search);
  for (const k of [...params.keys()]) if (k.startsWith("_x_tr_")) params.delete(k);
  const q = params.toString();
  const pathAndQuery = loc.pathname + (q ? `?${q}` : "") + loc.hash;

  if (to === "vi") return `https://${base}${pathAndQuery}`;

  const url = new URL(`https://${toTranslateHost(base)}${pathAndQuery}`);
  url.searchParams.set("_x_tr_sl", "vi"); // ngôn ngữ nguồn
  url.searchParams.set("_x_tr_tl", to);   // ngôn ngữ đích
  url.searchParams.set("_x_tr_hl", "vi"); // ngôn ngữ giao diện thanh Google
  return url.toString();
}
