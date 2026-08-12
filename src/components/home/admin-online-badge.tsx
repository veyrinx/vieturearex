"use client";

import { useCallback, useState } from "react";
import { Shield } from "lucide-react";
import { usePolling } from "@/hooks/use-polling";

// Huy hiệu này nằm ở trang chủ nên MỌI khách vào đều gọi API. Nhịp 60s cũ nhân
// với lượng truy cập là một trong những nguồn edge request lớn nhất. 3 phút là
// đủ cho một chỉ báo "đang trực", và tab ẩn thì ngừng hẳn.
const REFRESH_MS = 180_000;

export function AdminOnlineBadge() {
  const [admins, setAdmins] = useState<string[]>([]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/public/active-admins");
      if (!res.ok) return;
      const data = await res.json() as { admins?: string[] };
      setAdmins(data.admins ?? []);
    } catch { /* ignore */ }
  }, []);

  usePolling(fetchAdmins, REFRESH_MS);

  if (admins.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/8 px-3 py-1.5">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      <Shield className="size-3 text-green-500" />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-green-600 dark:text-green-400">
        {admins.length === 1 ? admins[0] : `${admins[0]} +${admins.length - 1}`} đang trực
      </span>
    </div>
  );
}
