"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Số đếm chạy (count-up) khi cuộn tới. Hỗ trợ số thập phân (vd K/D 2.35).
 * Dùng IntersectionObserver để chỉ chạy 1 lần khi lọt vào khung nhìn.
 */
export function CountNumber({
  value,
  duration = 1200,
  decimals,
}: {
  value: number;
  duration?: number;
  decimals?: number;
}) {
  const dec = decimals ?? (Number.isInteger(value) ? 0 : 2);
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - (1 - p) ** 3;
            if (p < 1) {
              setN(eased * value);
              requestAnimationFrame(tick);
            } else {
              setN(value);
            }
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {n.toLocaleString("vi-VN", { minimumFractionDigits: dec, maximumFractionDigits: dec })}
    </span>
  );
}
