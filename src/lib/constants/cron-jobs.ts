// Danh mục việc định kỳ. Lịch chạy đọc THẲNG từ vercel.json — chỗ duy nhất
// Vercel thực sự đọc — nên không thể lệch: thêm cron trong vercel.json là trang
// /admin/ops thấy ngay, kể cả khi quên đặt nhãn tiếng Việt ở dưới.
import vercelConfig from "../../../vercel.json";

export type CronJob = {
  /** Tên việc, lấy từ path: /api/cron/ff-watch → "ff-watch". */
  job: string;
  path: string;
  /** Biểu thức cron trong vercel.json (giờ UTC). */
  schedule: string;
  label: string;
  /** Việc này hỏng thì hỏng cái gì — để người trực biết có cần xử ngay không. */
  impact?: string;
};

/** Nhãn tiếng Việt cho từng việc. Thiếu nhãn thì hiện tên thô, không vỡ trang. */
const LABELS: Record<string, { label: string; impact?: string }> = {
  "daily-report":     { label: "Báo cáo ngày",        impact: "Ban quản trị mất bản tóm tắt hằng ngày." },
  "auth-report":      { label: "Báo cáo đăng nhập",   impact: "Không thấy bất thường đăng nhập." },
  "ff-version-check": { label: "Dò phiên bản FF",     impact: "Không biết game vừa ra bản mới." },
  "ff-watch":         { label: "Quét nick theo dõi",  impact: "Người theo dõi nick không nhận được báo đổi tên/guild." },
  "event-reminders":  { label: "Nhắc sự kiện",        impact: "Người dùng lỡ sự kiện sắp diễn ra." },
  "publish-scheduled":{ label: "Đăng bài hẹn giờ",    impact: "Bài hẹn giờ nằm im ở nháp." },
  "digest":           { label: "Bản tin tổng hợp",    impact: "Kênh Telegram/Discord im tiếng." },
  "hide-expired":     { label: "Ẩn nội dung hết hạn", impact: "Sự kiện cũ còn hiện như đang diễn ra." },
  "event-status":     { label: "Đồng bộ trạng thái sự kiện", impact: "Cột trạng thái lệch với ngày giờ thật." },
  "purge-expired":    { label: "Dọn dữ liệu quá hạn", impact: "Dữ liệu bàn giao acc giữ lâu hơn mức đã hứa." },
  "checkin-reminder": { label: "Nhắc điểm danh",      impact: "Chuỗi điểm danh của người dùng bị đứt." },
  "bxh-rank-notify":  { label: "Báo đổi hạng BXH",    impact: "Không ai biết mình lên/xuống hạng." },
  "shop-stale-orders":{ label: "Nhắc đơn treo ở chợ", impact: "Đơn nằm im không ai nhắc, dễ thành tranh chấp." },
};

type VercelCron = { path: string; schedule: string };

export const CRON_JOBS: CronJob[] = ((vercelConfig as { crons?: VercelCron[] }).crons ?? []).map((c) => {
  const job = c.path.replace(/^\/api\/cron\//, "");
  const meta = LABELS[job];
  return { job, path: c.path, schedule: c.schedule, label: meta?.label ?? job, impact: meta?.impact };
});

export const CRON_JOB_NAMES: string[] = CRON_JOBS.map((c) => c.job);

export function isKnownCronJob(job: string): boolean {
  return CRON_JOB_NAMES.includes(job);
}

/**
 * Khoảng cách giữa hai lần chạy, tính bằng giờ — dùng để biết một việc đã "quá
 * hạn" chưa. Chỉ đọc trường giờ, đủ cho các lịch đang dùng (Hobby chỉ cho chạy
 * mỗi ngày một lần; xem vercel.json).
 */
export function intervalHours(schedule: string): number {
  const hour = schedule.trim().split(/\s+/)[1] ?? "*";
  if (hour === "*") return 1;
  const step = /^\*\/(\d+)$/.exec(hour);
  if (step) return Math.max(1, parseInt(step[1], 10));
  // Nhiều mốc giờ trong ngày: "0 2,14 * * *" → cách nhau ~12 tiếng.
  const marks = hour.split(",").filter(Boolean).length;
  if (marks > 1) return Math.max(1, Math.round(24 / marks));
  return 24;
}

/** "0 8 * * *" → "08:00 UTC · 15:00 VN" (Việt Nam = UTC+7). */
export function describeSchedule(schedule: string): string {
  const [minute, hour] = schedule.trim().split(/\s+/);
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return schedule;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)} UTC · ${pad((h + 7) % 24)}:${pad(m)} VN`;
}
