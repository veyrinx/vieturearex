export type EventServer = {
  key: string;
  label: string;
  short: string;
  flag: string;
  color: string; // tailwind classes for badge
  logoUrl?: string | null; // optional image override for the flag emoji
};

export const EVENT_SERVERS: EventServer[] = [
  { key: "vn",     label: "Việt Nam",       short: "VN",     flag: "🇻🇳", color: "bg-red-500/10 text-red-500 border-red-500/30" },
  { key: "global", label: "Global",         short: "GLB",    flag: "🌐", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { key: "sea",    label: "SEA",            short: "SEA",    flag: "🌏", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  { key: "br",     label: "Brazil",         short: "BR",     flag: "🇧🇷", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  { key: "in",     label: "Ấn Độ",          short: "IN",     flag: "🇮🇳", color: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  { key: "id",     label: "Indonesia",      short: "ID",     flag: "🇮🇩", color: "bg-rose-500/10 text-rose-500 border-rose-500/30" },
  { key: "th",     label: "Thái Lan",       short: "TH",     flag: "🇹🇭", color: "bg-violet-500/10 text-violet-500 border-violet-500/30" },
  { key: "ph",     label: "Philippines",    short: "PH",     flag: "🇵🇭", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" },
  { key: "tw",     label: "Đài Loan",       short: "TW",     flag: "🇹🇼", color: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { key: "mena",   label: "Trung Đông",     short: "MENA",   flag: "🌍", color: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  { key: "latam",  label: "Mỹ Latin",       short: "LATAM",  flag: "🌎", color: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
];

export const EVENT_SERVER_BY_KEY: Record<string, EventServer> = Object.fromEntries(
  EVENT_SERVERS.map((s) => [s.key, s]),
);

export function getEventServer(key: string | null | undefined): EventServer | null {
  if (!key) return null;
  return EVENT_SERVER_BY_KEY[key.toLowerCase()] ?? null;
}

/**
 * Mã vùng hay gặp trong đường dẫn ảnh Free Fire → key server của site.
 *
 * Ảnh sự kiện gần như luôn lấy thẳng từ CDN Garena, mà đường dẫn có sẵn vùng:
 *   dl.dir.freefiremobile.com/common/Local/VN/Splash_Upload/260821_OB47VN_...
 * Đọc được vùng ở đó thì admin khỏi phải nhớ chọn server cho từng sự kiện.
 */
const IMAGE_REGION_ALIASES: Record<string, string> = {
  vn: "vn", vi: "vn",
  br: "br",
  in: "in", ind: "in",
  id: "id",
  th: "th",
  ph: "ph",
  tw: "tw",
  sg: "sea", my: "sea", sea: "sea",
  mena: "mena", me: "mena", ar: "mena",
  latam: "latam", la: "latam", mx: "latam",
  all: "global", ww: "global", global: "global", us: "global",
};

/**
 * Đoán server từ URL ảnh sự kiện. null = không đoán được, để người dùng tự chọn.
 *
 * Bắt hai dạng: thư mục vùng ("/Local/VN/") và mã bản dựng dính tên vùng
 * ("OB47VN"). Chỉ trả về khi chắc chắn — đoán bừa còn tệ hơn để trống, vì
 * server sai thì sự kiện lọt sang nhóm Zalo của server khác.
 */
export function guessServerFromImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const byFolder = url.match(/\/Local\/([A-Za-z]{2,5})\//i)?.[1];
  const byBuild = url.match(/OB\d+([A-Za-z]{2,5})[_./-]/i)?.[1];
  for (const candidate of [byFolder, byBuild]) {
    if (!candidate) continue;
    const key = IMAGE_REGION_ALIASES[candidate.toLowerCase()];
    if (key) return key;
  }
  return null;
}

const VALID_COLORS: Record<string, string> = {
  red: "bg-red-500/10 text-red-500 border-red-500/30",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  teal: "bg-teal-500/10 text-teal-500 border-teal-500/30",
  cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  violet: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  pink: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  rose: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  try { new URL(v); return v.slice(0, 500); } catch { return null; }
}

/**
 * Merge built-in presets with admin-defined custom servers, apply hide list,
 * and overlay per-server logo URLs.
 *
 * @param customRaw  JSON from setting `events.custom_servers`.
 *                   Array of { key, label, short, flag, colorKey, logoUrl }.
 * @param hiddenRaw  Comma list of preset keys to hide (`events.hidden_servers`).
 * @param logosRaw   JSON map { key: logoUrl } from `events.server_logos`.
 *                   Applies to both presets and custom servers.
 */
export function mergeEventServers(
  customRaw?: string | null,
  hiddenRaw?: string | null,
  logosRaw?: string | null,
): EventServer[] {
  const hidden = new Set(
    (hiddenRaw ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  let logoMap: Record<string, string> = {};
  if (logosRaw && logosRaw.trim()) {
    try {
      const parsed = JSON.parse(logosRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          const url = safeUrl(v);
          if (url) logoMap[k.toLowerCase()] = url;
        }
      }
    } catch { /* ignore */ }
  }

  let custom: EventServer[] = [];
  if (customRaw && customRaw.trim()) {
    try {
      const parsed = JSON.parse(customRaw) as Array<{
        key: string;
        label: string;
        short?: string;
        flag?: string;
        colorKey?: string;
        logoUrl?: string;
      }>;
      if (Array.isArray(parsed)) {
        custom = parsed
          .filter((row) => row && row.key && row.label)
          .map((row) => ({
            key: row.key.toLowerCase().slice(0, 20),
            label: row.label.slice(0, 40),
            short: (row.short || row.key).toUpperCase().slice(0, 6),
            flag: (row.flag || "🏳️").slice(0, 6),
            color: VALID_COLORS[(row.colorKey || "blue").toLowerCase()] ?? VALID_COLORS.blue,
            logoUrl: safeUrl(row.logoUrl),
          }));
      }
    } catch { /* ignore */ }
  }

  // Custom overrides preset by key; otherwise concat. Drop hidden. Apply logo overlay.
  const map = new Map<string, EventServer>();
  for (const s of EVENT_SERVERS) map.set(s.key, { ...s });
  for (const s of custom) map.set(s.key, s);
  const list = Array.from(map.values());
  for (const s of list) {
    if (logoMap[s.key]) s.logoUrl = logoMap[s.key];
  }
  return list.filter((s) => !hidden.has(s.key));
}
