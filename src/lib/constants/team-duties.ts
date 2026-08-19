/**
 * Danh sách mảng phụ trách của đội ngũ — nguồn duy nhất.
 *
 * Admin chọn từ đây thay vì gõ tay để mảng phụ trách trên /team không mỗi
 * người viết một kiểu ("Tin tức" / "tin tuc" / "News"), vì chuỗi này lên thẳng
 * JSON-LD gửi cho Google. Vẫn cho gõ thêm mục ngoài danh sách khi cần.
 */
export const TEAM_DUTY_PRESETS = [
  "Tin tức",
  "Sự kiện",
  "Wiki & Cẩm nang",
  "Esports & Giải đấu",
  "Diễn đàn",
  "Chợ Arex",
  "Hỗ trợ người dùng",
  "Kiểm duyệt nội dung",
  "Mạng xã hội",
  "Kỹ thuật & Hạ tầng",
  "Thiết kế",
  "Đối tác & Truyền thông",
] as const;

/** Giới hạn khớp ràng buộc trong migration-team-duties.sql. */
export const TEAM_TITLE_MAX = 60;
export const TEAM_FOCUS_MAX = 160;
export const TEAM_DUTIES_MAX = 6;
/** Mỗi mục phụ trách — đủ cho tên mảng, không đủ để nhét cả câu quảng cáo. */
export const TEAM_DUTY_MAX = 40;

/**
 * Lọc mảng phụ trách đọc từ DB (cột jsonb, ai cũng có thể ghi bậy vào): bỏ mục
 * không phải chuỗi, bỏ trùng, cắt độ dài và số lượng. Dùng ở cả API trước khi
 * ghi lẫn UI khi đọc ra, để một hàng dữ liệu hỏng không làm vỡ trang /team.
 */
export function normalizeDuties(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Map<string, string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const value = item.trim().slice(0, TEAM_DUTY_MAX);
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return [...seen.values()].slice(0, TEAM_DUTIES_MAX);
}
