"use client";

import { ReactNode, useEffect, useRef } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
  distance?: number;
  duration?: number;
  margin?: string;
};

/**
 * Hiện dần khi cuộn tới.
 *
 * Trước đây dựng bằng framer-motion và animate cả `filter: blur(8px)` lẫn
 * `scale`. Hai thứ đó buộc trình duyệt vẽ lại toàn bộ nội dung bên trong ở mỗi
 * khung hình — nhân với 19 chỗ dùng thì đủ làm cuộn trang giật. Nay: một
 * IntersectionObserver gắn class, còn chuyển động do CSS lo (xem `.reveal`
 * trong globals.css) nên chạy trên compositor, không đụng luồng chính.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  once = true,
  distance = 30,
  duration = 0.45,
  margin = "-60px",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Không có IntersectionObserver (hoặc người dùng đã tắt chuyển động) thì
    // hiện luôn, đừng để nội dung kẹt ở opacity 0.
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          if (once) observer.disconnect();
        } else if (!once) {
          el.classList.remove("is-visible");
        }
      },
      { rootMargin: margin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, margin]);

  return (
    <div
      ref={ref}
      className={["reveal", className].filter(Boolean).join(" ")}
      style={
        {
          "--reveal-distance": `${distance}px`,
          "--reveal-delay": `${delay}s`,
          transitionDuration: `${duration}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
