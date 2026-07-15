// Khóa / đánh dấu "đang cập nhật" theo TỪNG chức năng — KHÔNG phải bảo trì cả web.
// (Bảo trì toàn site vẫn dùng settings key `site.maintenance_mode` trong DB.)
//
// Cách dùng: thêm 1 dòng vào FEATURE_LOCKS là chức năng đó bị chặn, mọi truy cập
// sẽ được chuyển tới /dang-cap-nhat kèm thông báo. Áp cho cả route con (path + "/...").
// Muốn mở lại: xóa/comment dòng đó rồi deploy.

export type FeatureLockStatus = "maintenance" | "locked" | "coming-soon";

export type FeatureLock = {
  path: string; // route cần khóa, vd "/dinh-gia-nick"
  status?: FeatureLockStatus; // mặc định "maintenance"
  title?: string; // tiêu đề hiển thị (mặc định theo status)
  message?: string; // mô tả cho người dùng
  until?: string; // vd "20/07/2026" — dự kiến mở lại (tùy chọn)
};

// ── Danh sách chức năng đang khóa / cập nhật ──
export const FEATURE_LOCKS: FeatureLock[] = [
  // Ví dụ (bỏ // để bật):
  // { path: "/dinh-gia-nick", status: "maintenance", message: "Đang nâng cấp máy định giá, quay lại sau nhé.", until: "20/07/2026" },
  // { path: "/tinh-nap", status: "coming-soon", title: "Sắp ra mắt", message: "Công cụ tính nạp đang được hoàn thiện." },
];

export const LOCK_LABELS: Record<FeatureLockStatus, string> = {
  maintenance: "Đang bảo trì",
  locked: "Tạm khóa",
  "coming-soon": "Sắp ra mắt",
};

const norm = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

// Trả về lock khớp cụ thể nhất (path dài nhất) hoặc null.
export function findFeatureLock(pathname: string): FeatureLock | null {
  const path = norm(pathname);
  let best: FeatureLock | null = null;
  for (const lock of FEATURE_LOCKS) {
    const lp = norm(lock.path);
    if (path === lp || path.startsWith(lp + "/")) {
      if (!best || lp.length > norm(best.path).length) best = lock;
    }
  }
  return best;
}

export function isPathLocked(pathname: string): boolean {
  return findFeatureLock(pathname) !== null;
}
