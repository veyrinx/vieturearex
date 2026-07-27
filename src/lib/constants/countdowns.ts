// Đếm ngược sự kiện Free Fire — dữ liệu lưu trong settings key `site.countdowns` (JSON).
// Quản lý ở /admin/countdowns, hiển thị ở /countdown. Hàm thuần (client + server).

export const SETTINGS_KEY_COUNTDOWNS = "site.countdowns";

/** Nhãn phân loại — khớp bảng màu trong countdown-list.tsx. */
export const COUNTDOWN_TAGS = ["Update", "Rank", "Sự kiện", "Bảo trì"] as const;
export type CountdownTag = (typeof COUNTDOWN_TAGS)[number];

export type FFCountdown = {
  id: string;
  label: string;
  /** ISO có múi giờ, vd "2026-08-13T09:00:00+07:00". */
  date: string;
  note?: string;
  tag?: string;
  enabled?: boolean;
};

/** Chỉ nhận chuỗi parse được thành thời điểm hợp lệ. */
const isValidDate = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 40 && !Number.isNaN(new Date(v).getTime());

export function parseCountdowns(raw: string | null | undefined): FFCountdown[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: FFCountdown[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim().slice(0, 100) : "";
    if (!label || !isValidDate(o.date)) continue; // bỏ mốc không có ngày hợp lệ
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : Math.random().toString(36).slice(2),
      label,
      date: o.date,
      note: typeof o.note === "string" && o.note.trim() ? o.note.trim().slice(0, 200) : undefined,
      tag: typeof o.tag === "string" && o.tag.trim() ? o.tag.trim().slice(0, 30) : undefined,
      enabled: o.enabled !== false,
    });
    if (out.length >= 40) break;
  }
  return out;
}

export function serializeCountdowns(items: FFCountdown[]): string {
  return JSON.stringify(
    items.map((i) => ({
      id: i.id,
      label: i.label,
      date: i.date,
      ...(i.note ? { note: i.note } : {}),
      ...(i.tag ? { tag: i.tag } : {}),
      ...(i.enabled === false ? { enabled: false } : {}),
    })),
  );
}

/** Mẫu ban đầu khi admin chưa cấu hình gì (giữ từ ff-countdowns.ts cũ). */
export const DEFAULT_COUNTDOWNS: FFCountdown[] = [
  { id: "reset-rank", label: "Reset rank cuối mùa", date: "2026-07-31T23:59:00+07:00",
    note: "Leo rank trước khi reset để nhận thưởng!", tag: "Rank", enabled: true },
  { id: "ob-update", label: "Cập nhật máy chủ (OB mới)", date: "2026-08-13T09:00:00+07:00",
    note: "Bảo trì ~4 tiếng, không vào game được", tag: "Update", enabled: true },
];
