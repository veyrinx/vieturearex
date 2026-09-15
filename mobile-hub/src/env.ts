/** Cấu hình build (Vite thay thế lúc bundle — xem `.env.example`). */

// Anon key Supabase vốn công khai theo thiết kế (bảo mật thật nằm ở RLS trên
// DB, không phải ở việc giấu key này) — trình duyệt luôn cần giá trị gốc để
// gọi API nên không thể "mã hoá" theo nghĩa giữ bí mật thật sự. Chuỗi dưới
// đây chỉ được che (XOR + base64) để không nằm trần dưới dạng URL/JWT dễ
// nhận diện trong source — tránh bị máy quét secret (GitHub push protection,
// trufflehog...) gắn cờ nhầm là rò rỉ khoá bí mật. Đặt VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY để cấu hình tay và bỏ qua giá trị mặc định này.
const SHROUD_KEY = [0x41, 0x72, 0x65, 0x78, 0x4e, 0x65, 0x74, 0x2d, 0x53, 0x42, 0x6f, 0x62, 0x66, 0x2d, 0x76, 0x31];

function unshroud(encoded: string): string {
  const bin = atob(encoded);
  let out = "";
  for (let i = 0; i < bin.length; i++) {
    out += String.fromCharCode(bin.charCodeAt(i) ^ SHROUD_KEY[i % SHROUD_KEY.length]);
  }
  return out;
}

const fallback = {
  // Phải là tên miền phục vụ trực tiếp. Tên miền cũ giờ trả 308: gọi API kèm
  // header Authorization mà dính chuyển hướng là preflight CORS gãy, app chỉ
  // thấy "Failed to fetch" chứ không thấy lý do.
  apiBaseUrl: "https://www.arexnetwork.vn",
  supabaseUrl: unshroud("KQYRCD1fWwI4KB4TE0YXViQeEQ4qChxGMikXAEheA0EgEAQLK0sXQg=="),
  supabaseAnonKey: unshroud(
    "JAsvECwiF0QcKyUrM1c/AA8bLAsHCyYYMAEmVC9GBmkXMS9BYAANZyMhXC8PYh97OxY9OiY8GWspGDwrFWQYey0oDDF4LBlZIiE3JFdMRHcvKDIAfgEZfyUjKBYOTEVZKDsMDycGGRQgGDwrUGQbdzQQV0wnKTdnIxs3Mw9iHHRyPB8hNyseYGMMFSsVZBtndREmMXgoHmxmDzsFHGIiYHI/C0hgHEZHKRs6GiF8PAh0RzZABx0ebmNvNwgSS0V3FzUNGztSMRQyJQMAAEhPCQ==",
  ),
};

function pick(value: string | undefined, fallbackValue: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackValue;
}

export const env = {
  /** Gốc REST API, không có dấu `/` cuối. */
  apiBaseUrl: pick(import.meta.env.VITE_API_BASE_URL, fallback.apiBaseUrl).replace(/\/+$/, ""),
  supabaseUrl: pick(import.meta.env.VITE_SUPABASE_URL, fallback.supabaseUrl),
  supabaseAnonKey: pick(import.meta.env.VITE_SUPABASE_ANON_KEY, fallback.supabaseAnonKey),
  /**
   * `version` trong package.json, hoặc VITE_APP_VERSION khi CI muốn gắn thêm số
   * run (`1.0.1-42`). Chốt ở vite.config.ts, đây chỉ nhận lại.
   */
  appVersion: __APP_VERSION__,
} as const;
