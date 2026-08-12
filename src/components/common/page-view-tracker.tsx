"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Mỗi lần gửi là 1 lần chạy function + vài lượt ghi Supabase. Trước đây điều
// hướng kiểu SPA nào cũng bắn, kể cả quay lui/tiến liên tục hay component bị
// mount lại → hóa đơn Vercel phồng lên vì những lượt đếm trùng.
const MIN_GAP_MS = 10_000;

export function PageViewTracker() {
  const pathname = usePathname();
  const lastSentRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    // Chỉ đếm trang public, không đếm admin
    if (!pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;

    // Tab đang ẩn (prerender, mở nền) thì chưa phải lượt xem thật.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const now = Date.now();
    const last = lastSentRef.current;
    if (last && last.path === pathname && now - last.at < MIN_GAP_MS) return;
    lastSentRef.current = { path: pathname, at: now };

    const body = JSON.stringify({ path: pathname });

    // sendBeacon: trình duyệt tự gửi nền, không giữ kết nối chờ phản hồi.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(
        "/api/analytics/pageview",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }

    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => null);
  }, [pathname]);

  return null;
}
