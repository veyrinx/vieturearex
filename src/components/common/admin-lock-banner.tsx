"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAdminRole } from "@/hooks/use-admin-role";
import { findFeatureLock, LOCK_LABELS, type FeatureLock } from "@/lib/constants/feature-locks";

// Banner chỉ hiện khi: (1) trang hiện tại đang bị khóa, VÀ (2) người xem là admin.
// User thường không bao giờ tới được đây (middleware đã chuyển sang /updating).
export function AdminLockBanner() {
  const pathname = usePathname();
  const { isAdmin, loading } = useAdminRole();
  const [locks, setLocks] = useState<FeatureLock[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch("/api/feature-locks")
      .then((r) => (r.ok ? r.json() : { locks: [] }))
      .then((d) => { if (!cancelled) setLocks(Array.isArray(d.locks) ? d.locks : []); })
      .catch(() => { if (!cancelled) setLocks([]); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const lock = pathname && locks ? findFeatureLock(pathname, locks) : null;
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
