// Khóa / đánh dấu "đang cập nhật" theo TỪNG chức năng — KHÔNG phải bảo trì cả web.
// Nguồn dữ liệu: settings key `site.feature_locks` (quản lý trong /admin/feature-locks).
// File này chỉ giữ kiểu + hàm thuần (dùng được cả client & middleware).

export type FeatureLockStatus = "maintenance" | "locked" | "coming-soon";

export type FeatureLock = {
  path: string; // route cần khóa, vd "/dinh-gia-nick" (áp cho cả route con)
  status?: FeatureLockStatus; // mặc định "maintenance"
  title?: string;
  message?: string;
  until?: string; // vd "20/07/2026"
};

export const SETTINGS_KEY_FEATURE_LOCKS = "site.feature_locks";

export const LOCK_STATUSES: FeatureLockStatus[] = ["maintenance", "locked", "coming-soon"];

export const LOCK_LABELS: Record<FeatureLockStatus, string> = {
  maintenance: "Đang bảo trì",
  locked: "Tạm khóa",
  "coming-soon": "Sắp ra mắt",
};

const norm = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

// Trả về lock khớp cụ thể nhất (path dài nhất) hoặc null.
export function findFeatureLock(pathname: string, locks: FeatureLock[]): FeatureLock | null {
  if (!pathname || !Array.isArray(locks) || locks.length === 0) return null;
  const path = norm(pathname);
  let best: FeatureLock | null = null;
  for (const lock of locks) {
    if (!lock?.path) continue;
    const lp = norm(lock.path);
    if (path === lp || path.startsWith(lp + "/")) {
      if (!best || lp.length > norm(best.path).length) best = lock;
    }
  }
  return best;
}

export function isPathLocked(pathname: string, locks: FeatureLock[]): boolean {
  return findFeatureLock(pathname, locks) !== null;
}

// Parse + làm sạch giá trị đọc từ settings (JSON string) → danh sách lock hợp lệ.
export function parseFeatureLocks(raw: string | null | undefined): FeatureLock[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: FeatureLock[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const path = typeof o.path === "string" ? o.path.trim() : "";
    if (!path.startsWith("/")) continue;
    const status = LOCK_STATUSES.includes(o.status as FeatureLockStatus)
      ? (o.status as FeatureLockStatus)
      : "maintenance";
    out.push({
      path,
      status,
      title: typeof o.title === "string" ? o.title.slice(0, 120) : undefined,
      message: typeof o.message === "string" ? o.message.slice(0, 400) : undefined,
      until: typeof o.until === "string" ? o.until.slice(0, 40) : undefined,
    });
    if (out.length >= 100) break;
  }
  return out;
}

export function serializeFeatureLocks(locks: FeatureLock[]): string {
  return JSON.stringify(
    locks.map((l) => ({
      path: l.path,
      status: l.status ?? "maintenance",
      ...(l.title ? { title: l.title } : {}),
      ...(l.message ? { message: l.message } : {}),
      ...(l.until ? { until: l.until } : {}),
    })),
  );
}
