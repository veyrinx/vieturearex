/**
 * Bảng nhận diện thiết bị — dùng cho công cụ Chỉnh Độ Nhạy.
 *
 * Mục tiêu: từ những gì trình duyệt (hoặc vỏ native) chịu tiết lộ — chuỗi GPU
 * của WebGL, tên model từ User-Agent Client Hints, độ phân giải màn hình —
 * đoán ra máy thuộc hạng nào để đề xuất độ nhạy sát thực tế.
 *
 * Không có bảng nào đúng 100%; mọi hàm ở đây trả về `null` khi không chắc,
 * để bên gọi rơi về cách chấm điểm chung (số nhân, RAM, tần số quét).
 */

export type DeviceTier = "entry" | "mid" | "flagship";

export const DEVICE_TIER_LABEL: Record<DeviceTier, string> = {
  entry: "Máy Yếu",
  mid: "Tầm Trung",
  flagship: "Cao Cấp",
};

// ── GPU (chuỗi WEBGL_debug_renderer_info) ──────────────────────────────────
// Thứ tự quan trọng: luật cụ thể đặt trước luật rộng.
const GPU_RULES: { re: RegExp; tier: DeviceTier }[] = [
  // Qualcomm Adreno
  { re: /Adreno.*\b(8\d{2})\b/i, tier: "flagship" },   // 8xx — Snapdragon 8 Gen 3/4+
  { re: /Adreno.*\b(7[3-9]\d)\b/i, tier: "flagship" }, // 730-790
  { re: /Adreno.*\b(7[0-2]\d)\b/i, tier: "mid" },      // 702-725
  { re: /Adreno.*\b(6[6-9]\d)\b/i, tier: "flagship" }, // 660-699
  { re: /Adreno.*\b(6[4-5]\d)\b/i, tier: "mid" },      // 640-650
  { re: /Adreno.*\b(6[0-3]\d)\b/i, tier: "entry" },    // 605-635
  { re: /Adreno.*\b(5[3-4]\d)\b/i, tier: "mid" },      // 530-540
  { re: /Adreno.*\b([2-5]\d{2})\b/i, tier: "entry" },
  // ARM Mali
  { re: /Immortalis/i, tier: "flagship" },
  { re: /Mali-G7\d{2}/i, tier: "flagship" },           // G710/G715/G720
  { re: /Mali-G6\d{2}/i, tier: "mid" },                // G610/G615
  { re: /Mali-G(77|78|79)/i, tier: "flagship" },
  { re: /Mali-G(68|76)/i, tier: "mid" },
  { re: /Mali-G(51|52|57)/i, tier: "entry" },
  { re: /Mali-G\d+/i, tier: "mid" },
  { re: /Mali-T\d+/i, tier: "entry" },
  // Samsung Xclipse (AMD RDNA)
  { re: /Xclipse/i, tier: "flagship" },
  // Imagination PowerVR
  { re: /PowerVR.*(BXM|GM9)/i, tier: "mid" },
  { re: /PowerVR/i, tier: "entry" },
  // Máy tính — coi như cao cấp
  { re: /(NVIDIA|GeForce|RTX|GTX|Radeon|Intel.*(Arc|Iris))/i, tier: "flagship" },
  { re: /Intel.*(UHD|HD Graphics)/i, tier: "mid" },
];

/** Rút gọn chuỗi renderer dài loằng ngoằng thành tên GPU đọc được. */
export function prettyGpu(renderer: string): string {
  const m = renderer.match(
    /(Adreno(?:\s*\(TM\))?\s*\d+|Mali-\w+(?:-\w+)?|Immortalis-\w+|Xclipse\s*\d+|PowerVR\s*[\w-]+|Apple\s*[\w\s]*GPU|NVIDIA[^,)]*|Radeon[^,)]*|Intel[^,)]*)/i,
  );
  const raw = (m?.[1] ?? renderer).replace(/\(TM\)/gi, "").replace(/\s+/g, " ").trim();
  return raw.length > 28 ? `${raw.slice(0, 28)}…` : raw;
}

/** Hạng máy suy từ chuỗi GPU. `null` nếu không khớp luật nào. */
export function tierFromGpu(renderer: string | null | undefined): DeviceTier | null {
  if (!renderer) return null;
  for (const rule of GPU_RULES) if (rule.re.test(renderer)) return rule.tier;
  return null;
}

// ── iOS: nhận diện qua độ phân giải logic + devicePixelRatio ───────────────
// Khoá dạng "rộng x cao @ dpr" (cạnh ngắn trước). Đây là cách duy nhất đoán
// được đời máy trên Safari, vì iOS không trả model qua User-Agent.
const IOS_SCREEN: Record<string, { name: string; tier: DeviceTier }> = {
  "320x568@2": { name: "iPhone SE / 5s", tier: "entry" },
  "375x667@2": { name: "iPhone 6/7/8/SE2/SE3", tier: "mid" },
  "414x736@3": { name: "iPhone 6/7/8 Plus", tier: "entry" },
  "375x812@3": { name: "iPhone X/XS/11 Pro/12–13 mini", tier: "mid" },
  "414x896@2": { name: "iPhone XR / 11", tier: "mid" },
  "414x896@3": { name: "iPhone XS Max / 11 Pro Max", tier: "mid" },
  "390x844@3": { name: "iPhone 12/13/14", tier: "flagship" },
  "428x926@3": { name: "iPhone 12–13 Pro Max / 14 Plus", tier: "flagship" },
  "393x852@3": { name: "iPhone 14 Pro / 15 / 16", tier: "flagship" },
  "430x932@3": { name: "iPhone 14 Pro Max / 15 Plus / 15 Pro Max", tier: "flagship" },
  "402x874@3": { name: "iPhone 16 Pro", tier: "flagship" },
  "440x956@3": { name: "iPhone 16 Pro Max", tier: "flagship" },
  "375x812@2": { name: "iPhone 12 mini", tier: "flagship" },
};

export function iosDeviceFromScreen(
  width: number,
  height: number,
  dpr: number,
): { name: string; tier: DeviceTier } | null {
  const w = Math.min(width, height);
  const h = Math.max(width, height);
  const r = Math.round(dpr);
  return IOS_SCREEN[`${w}x${h}@${r}`] ?? null;
}

// ── iOS: nhận diện qua mã máy (chỉ có khi chạy trong app native) ───────────
// "iPhone14,5" → thế hệ 14. Mốc: ≤9 quá cũ, 10–11 tầm trung thấp,
// 12–13 tầm trung, ≥14 (đời iPhone 13 trở lên) coi là cao cấp.
export function iosDeviceFromIdentifier(
  id: string | null | undefined,
): { name: string; tier: DeviceTier } | null {
  if (!id) return null;
  const m = id.match(/^(iPhone|iPad)(\d+),(\d+)$/i);
  if (!m) return null;
  const kind = m[1];
  const gen = Number(m[2]);
  let tier: DeviceTier;
  if (kind.toLowerCase() === "ipad") tier = gen >= 13 ? "flagship" : gen >= 8 ? "mid" : "entry";
  else if (gen >= 14) tier = "flagship";
  else if (gen >= 12) tier = "mid";
  else if (gen >= 10) tier = "mid";
  else tier = "entry";
  return { name: id, tier };
}

// ── Tên hãng từ User-Agent ─────────────────────────────────────────────────
export function guessBrand(ua: string): string {
  const s = ua || "";
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/SM-|Samsung/i.test(s)) return "Samsung";
  if (/Redmi|POCO|Xiaomi|\bMI\b/i.test(s)) return "Xiaomi";
  if (/OPPO|CPH/i.test(s)) return "OPPO";
  if (/vivo/i.test(s)) return "vivo";
  if (/Realme|RMX/i.test(s)) return "Realme";
  if (/OnePlus/i.test(s)) return "OnePlus";
  if (/HUAWEI|Honor/i.test(s)) return "Huawei/Honor";
  const other = s.match(/(Nokia|Infinix|Tecno|itel)/i);
  if (other) return other[1];
  if (/Android/i.test(s)) return "Android";
  if (/Windows|Macintosh|Mac OS|Linux/i.test(s)) return "Máy tính";
  return "Thiết bị";
}

/** Đoán hãng từ mã model Android khi UA đã bị rút gọn (SM-A155F, RMX3231…). */
export function brandFromModel(model: string | null | undefined): string | null {
  if (!model) return null;
  if (/^SM-/i.test(model)) return "Samsung";
  if (/^(RMX|RE\d)/i.test(model)) return "Realme";
  if (/^CPH/i.test(model)) return "OPPO";
  if (/^(V\d{4}|vivo)/i.test(model)) return "vivo";
  if (/^(M\d{4}|22|23|24|21|2[0-9]{3})[A-Z]/i.test(model)) return "Xiaomi";
  if (/^(Redmi|POCO|Mi\b)/i.test(model)) return "Xiaomi";
  if (/^(Infinix|X6\d{3})/i.test(model)) return "Infinix";
  if (/^(TECNO|KI\d)/i.test(model)) return "TECNO";
  if (/^(Pixel)/i.test(model)) return "Google";
  if (/^iPhone/i.test(model)) return "iPhone";
  return null;
}
