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

export function parseVietnamDateInputEnd(value: string) {
  return new Date(`${value}T23:59:59.999+07:00`);
}

export function getEventStatusInVietnam(
  startDate: Date | string,
  endDate: Date | string,
  now: Date = new Date(),
): EventStatus {
  const todayKey = getVietnamDateKey(now);
  const startKey = getVietnamDateKey(startDate);
  const endKey = getVietnamDateKey(endDate);

  if (todayKey < startKey) {
    return "upcoming";
  }

  if (todayKey > endKey) {
    return "expired";
  }

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

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function formatVietnamWeekdayShort(value: Date | string) {
  const date = new Date(value);
  // Tính ngày trong tuần theo giờ Việt Nam (UTC+7)
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnMs = utcMs + 7 * 3600000;
  const dayOfWeek = new Date(vnMs).getDay(); // 0=CN, 1=T2...6=T7
  return WEEKDAY_SHORT[dayOfWeek];
}
