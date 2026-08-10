"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Hàng cuộn ngang có nút trái/phải.
 *
 * Phần "use client" chỉ bọc cái khung: các thẻ bên trong vẫn do server dựng và
 * truyền vào qua children, nên không có component nội dung nào bị kéo xuống
 * bundle của trình duyệt.
 *
 * Trên cảm ứng người dùng vuốt là xong nên hai nút chỉ hiện từ md trở lên, và
 * chỉ hiện khi thật sự còn chỗ để cuộn về phía đó — một nút bấm không làm gì
 * là lời nói dối nhỏ với người dùng.
 */

type ScrollRowProps = {
  children: ReactNode;
  /** Nhãn cho trình đọc màn hình, vì đây là một vùng cuộn có thể focus. */
  label?: string;
  className?: string;
};

export function ScrollRow({ children, label, className }: ScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Trừ 1px: scrollWidth/clientWidth hay lệch phần lẻ sau khi trình duyệt làm
    // tròn, khiến nút phải không bao giờ tắt dù đã cuộn hết.
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Số thẻ có thể đổi (dữ liệu tải lại) và bề ngang đổi khi xoay máy —
    // ResizeObserver bắt được cả hai mà không cần nghe resize toàn cửa sổ.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Cuộn khoảng 85% khung nhìn: chừa lại một mẩu thẻ cũ làm mốc để người dùng
    // biết mình vừa đi từ đâu tới.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
      >
        {children}
      </div>

      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Cuộn sang trái"
          className="absolute -left-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:flex"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Cuộn sang phải"
          className="absolute -right-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-primary md:flex"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
