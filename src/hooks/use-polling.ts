"use client";

import { useEffect, useRef } from "react";

/**
 * setInterval nhưng biết dừng khi tab bị ẩn.
 *
 * setInterval trần vẫn chạy đều khi người dùng chuyển sang tab khác — một tab
 * bỏ quên cả ngày vẫn nã request suốt, mỗi request là một lần chạy function
 * tính tiền trên Vercel. Hook này dừng hẳn lúc tab ẩn và gọi lại một lần ngay
 * khi tab sáng trở lại (để dữ liệu vẫn mới trước mắt người dùng).
 *
 * @param callback việc cần chạy mỗi nhịp
 * @param intervalMs nhịp; truyền null để tắt hẳn
 * @param options.immediate chạy ngay lần đầu (mặc định true)
 */
export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number | null,
  options: { immediate?: boolean } = {},
) {
  const { immediate = true } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs === null) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      void savedCallback.current();
    };

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run(); // bắt kịp phần đã lỡ trong lúc ẩn
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") {
      if (immediate) run();
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, immediate]);
}
