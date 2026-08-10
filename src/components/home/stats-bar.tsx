"use client";

import { useEffect, useRef, useState } from "react";
import { Newspaper, Image as ImageIcon, Users, Wrench } from "lucide-react";

type StatItem = {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
};

export function CountUp({ target, duration = 1400 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString("vi-VN")}</span>;
}

type StatsBarProps = {
  newsCount: number;
  galleryCount: number;
  memberCount?: number;
  toolCount?: number;
};

// Số cột ở desktop bám theo số ô thật. Phải là chuỗi tĩnh thì Tailwind mới quét
// ra class lúc build, nên tra bảng chứ không nối chuỗi.
const DESKTOP_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function StatsBar({ newsCount, galleryCount, memberCount, toolCount }: StatsBarProps) {
  const stats: StatItem[] = [
    { icon: <Newspaper className="size-5 shrink-0" />, value: newsCount, label: "Bài viết" },
    { icon: <ImageIcon className="size-5 shrink-0" />, value: galleryCount, label: "Ảnh cộng đồng" },
    ...(memberCount !== undefined
      ? [{ icon: <Users className="size-5 shrink-0" />, value: memberCount, suffix: "+", label: "Thành viên" }]
      : toolCount !== undefined
      ? [{ icon: <Wrench className="size-5 shrink-0" />, value: toolCount, label: "Công cụ" }]
      : []),
  ];

  return (
    // Full-bleed do <PulseBar> bọc ngoài lo — ở đây chỉ dựng lưới chỉ số.
    <div className="relative bg-primary/[0.04]">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className={`relative mx-auto grid max-w-7xl grid-cols-2 ${DESKTOP_COLS[stats.length] ?? "md:grid-cols-3"}`}>
        {stats.map((stat, i) => {
          // Mobile xếp 2 cột; nếu tổng số ô lẻ thì ô cuối đứng một mình ở hàng
          // dưới — cho nó chiếm trọn bề ngang thay vì bỏ trống nửa hàng.
          const spansRow = stats.length % 2 === 1 && i === stats.length - 1;
          return (
          <div
            key={i}
            className={[
              "group relative flex flex-col items-center justify-center gap-1 px-4 py-6 text-center",
              spansRow ? "col-span-2 md:col-span-1" : "",
            ].join(" ")}
          >
            {/* Vạch ngăn dọc chỉ vẽ khi ô KHÔNG đứng đầu hàng, nếu không thì ô mở
                đầu hàng 2 trên mobile lại kẻ một gạch thừa dính mép trái. Desktop
                dồn hết về một hàng nên mọi ô trừ ô đầu đều có vạch. */}
            {i > 0 && (
              <div
                className={[
                  "absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent",
                  i % 2 === 1 && !spansRow ? "block" : "hidden",
                  "md:block",
                ].join(" ")}
              />
            )}

            {/* Vạch ngang giữa hai hàng — chỉ có ý nghĩa ở lưới 2 cột của mobile */}
            {i >= 2 && (
              <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent md:hidden" />
            )}

            <div className="mb-1 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              {stat.icon}
            </div>

            <p className="font-heading text-2xl font-extrabold tabular-nums text-foreground md:text-3xl">
              <CountUp target={stat.value} />
              {stat.suffix}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {stat.label}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
}
