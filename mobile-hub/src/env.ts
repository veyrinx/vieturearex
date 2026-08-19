/** Cấu hình build (Vite thay thế lúc bundle — xem `.env.example`). */

const fallback = {
  // Phải là tên miền phục vụ trực tiếp. Tên miền cũ giờ trả 308: gọi API kèm
  // header Authorization mà dính chuyển hướng là preflight CORS gãy, app chỉ
  // thấy "Failed to fetch" chứ không thấy lý do.
  apiBaseUrl: "https://www.arexnetwork.vn",
  supabaseUrl: "https://kjqqukageltvdohkakxb.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcXF1a2FnZWx0dmRvaGtha3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjM0NzIsImV4cCI6MjA5MTgzOTQ3Mn0.y2jzYUxGQJ955S8IxjC0-Xjtf3FVGhcu7E9aglbfe98",
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
