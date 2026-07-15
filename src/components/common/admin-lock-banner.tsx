"use client";

import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAdminRole } from "@/hooks/use-admin-role";
import { findFeatureLock, LOCK_LABELS } from "@/lib/constants/feature-locks";

// Banner chỉ hiện khi: (1) trang hiện tại đang bị khóa, VÀ (2) người xem là admin.
// User thường không bao giờ tới được đây (middleware đã chuyển sang /dang-cap-nhat).
export function AdminLockBanner() {
  const pathname = usePathname();
  const { isAdmin, loading } = useAdminRole();

  const lock = pathname ? findFeatureLock(pathname) : null;
  if (loading || !isAdmin || !lock) return null;

  const label = LOCK_LABELS[lock.status ?? "maintenance"];

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
      <div className="min-w-0 text-sm">
        <p className="font-bold">
          Chế độ xem quản trị · {label}
        </p>
        <p className="text-amber-700/90 dark:text-amber-300/80">
          Chức năng này đang bị khóa với người dùng thường (họ thấy trang “đang cập nhật”).
          Bạn đang xem giao diện thật nhờ quyền admin.
          {lock.until ? ` Dự kiến mở lại: ${lock.until}.` : ""}
        </p>
      </div>
    </div>
  );
}
