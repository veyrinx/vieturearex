import type { EventStatus } from "@/lib/types/content";

export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

type VietnamDateParts = {
  year: string;
  month: string;
  day: string;
};

function getVietnamDateParts(value: Date | string): VietnamDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

export function getVietnamDateKey(value: Date | string) {
  const { year, month, day } = getVietnamDateParts(value);
  return `${year}-${month}-${day}`;
}

export function formatVietnamDate(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatVietnamDateTime(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "2024";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const normalizedHour = hour === "24" ? "00" : hour;

  return `${day}/${month}/${year} ${normalizedHour}:${minute}`;
}

export function formatVietnamTimeInput(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour === "24" ? "00" : hour}:${minute}`;
}

export function toVietnamIsoFromDateTimeInput(date: string, time: string) {
  const trimmedDate = (date || "").trim();
  const trimmedTime = (time || "00:00").trim();
  if (!trimmedDate) throw new Error("Invalid date input: empty date string");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) throw new Error("Invalid date input: must be YYYY-MM-DD");
  const parsed = new Date(`${trimmedDate}T${trimmedTime}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date/time input");
  return parsed.toISOString();
}

export function formatVietnamDateInput(value: Date | string) {
  return getVietnamDateKey(value);
}

export function toVietnamIsoFromDateInput(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    throw new Error("Invalid date input: empty date string");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00+07:00`);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date input: malformed date");
    }
    return date.toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date input: malformed date");
  }
  return parsed.toISOString();
}

export function parseVietnamDateInputStart(value: string) {
  return new Date(`${value}T00:00:00+07:00`);
}

/**
 * Mốc 00:00 giờ VN của hôm nay, lệch `offsetDays` ngày — dạng ISO để so trong
 * truy vấn Supabase. Nhờ mốc này mà điều kiện lọc theo NGÀY khớp đúng với
 * `getEventStatusInVietnam`, vốn so bằng date-key chứ không so timestamp.
 */
export function vietnamDayStartIso(offsetDays = 0, now: Date = new Date()) {
  const { year, month, day } = getVietnamDateParts(now);
  const midnight = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  // VN không có giờ mùa hè nên cộng thẳng số ms là đủ.
  return new Date(midnight.getTime() + offsetDays * 86_400_000).toISOString();
}

export function parseVietnamDateInputEnd(value: string) {
  return new Date(`${value}T23:59:59.999+07:00`);
}

export function getEventStatusInVietnam(
  startDate: Date | string,
  endDate: Date | string,
  now: Date = new Date(),
): EventStatus {
  // Primary: compare by Vietnam date-keys (user thinks in dates, not exact timestamps)
  // Event "M1 → M3" should be active for the entire day of M1, M2, and M3 in Vietnam time
  const todayKey = getVietnamDateKey(now);
  const startKey = getVietnamDateKey(startDate);
  const endKey = getVietnamDateKey(endDate);

  if (!todayKey || !startKey || !endKey) {
    // Fallback to timestamp comparison if date-keys can't be derived
    const nowMs = now.getTime();
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "upcoming";
    if (nowMs < startMs) return "upcoming";
    if (nowMs > endMs) return "expired";
    return "active";
  }

  if (todayKey < startKey) return "upcoming";
  if (todayKey > endKey) return "expired";
  return "active";
}

export function isEventInCurrentVietnamMonthWindow(startDate: Date | string, now: Date = new Date()) {
  const { year, month } = getVietnamDateParts(now);
  const startKey = getVietnamDateKey(startDate);
  const currentMonthKey = `${year}-${month}`;

  const numericMonth = Number.parseInt(month, 10);
  const numericYear = Number.parseInt(year, 10);
  const nextMonth = numericMonth === 12 ? 1 : numericMonth + 1;
  const nextYear = numericMonth === 12 ? numericYear + 1 : numericYear;
  const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;

  return (
    startKey.startsWith(currentMonthKey) ||
    (startKey.startsWith(nextMonthKey) && Number.parseInt(startKey.slice(-2), 10) <= 10)
  );
}

export function getVietnamCurrentMonthRange(now: Date = new Date()) {
  const { year, month } = getVietnamDateParts(now);
  const numericMonth = Number.parseInt(month, 10);
  const numericYear = Number.parseInt(year, 10);
  const nextMonth = numericMonth === 12 ? 1 : numericMonth + 1;
  const nextYear = numericMonth === 12 ? numericYear + 1 : numericYear;
  const start = new Date(`${year}-${month}-01T00:00:00+07:00`);
  const nextMonthStart = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`,
  );
  const end = new Date(nextMonthStart.getTime() - 1);

  return { start, end };
}

export function formatVietnamMonthLabel(value: Date | string) {
  const month = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    month: "numeric",
  }).format(new Date(value));
  return `THÁNG ${month}`;
}

export function formatVietnamDayNumber(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    day: "2-digit",
  }).format(new Date(value));
}

const WEEKDAY_SHORT_BY_EN: Record<string, string> = {
  Sun: "CN", Mon: "T2", Tue: "T3", Wed: "T4", Thu: "T5", Fri: "T6", Sat: "T7",
};

export function formatVietnamWeekdayShort(value: Date | string) {
  const en = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIMEZONE,
    weekday: "short",
  }).format(new Date(value));
  return WEEKDAY_SHORT_BY_EN[en] ?? en;
}
