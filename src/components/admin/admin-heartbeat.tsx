"use client";

import { useCallback } from "react";
import { usePolling } from "@/hooks/use-polling";

// Cửa sổ "đang trực" phía server là 90s, nên nhịp 60s vẫn giữ admin luôn được
// tính là online. Nhịp cũ 15s tạo gấp 4 lần số lần chạy function mà không đổi
// kết quả hiển thị. usePolling còn dừng hẳn khi tab admin bị ẩn.
const HEARTBEAT_MS = 60_000;

export function AdminHeartbeat() {
  const ping = useCallback(async () => {
    await fetch("/api/admin/active-admins", { method: "POST" }).catch(() => null);
  }, []);

  usePolling(ping, HEARTBEAT_MS);

  return null;
}
