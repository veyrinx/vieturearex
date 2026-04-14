"use client";

import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút

export function AutoReload() {
  const lastActiveRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      lastActiveRef.current = Date.now();
    };

    const scheduleCheck = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Chỉ reload nếu user thực sự không hoạt động đủ 30 phút
        if (Date.now() - lastActiveRef.current >= IDLE_TIMEOUT_MS) {
          window.location.reload();
        } else {
          scheduleCheck();
        }
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "focus"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    // Khi tab được focus lại sau khi ẩn
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastActiveRef.current >= IDLE_TIMEOUT_MS) {
          window.location.reload();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleCheck();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
