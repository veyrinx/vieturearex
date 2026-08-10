"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Newspaper, Image as ImageIcon, Users, Wrench } from "lucide-react";

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
  eventCount: number;
  newsCount: number;
  galleryCount: number;
  memberCount?: number;
  toolCount?: number;
};

export function StatsBar({ eventCount, newsCount, galleryCount, memberCount, toolCount }: StatsBarProps) {
  const stats: StatItem[] = [
    { icon: <CalendarCheck className="size-5 shrink-0" />, value: eventCount, label: "Sự kiện" },
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

      <div className="relative mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="group relative flex flex-col items-center justify-center gap-1 px-4 py-6 text-center"
          >
            {/* Vạch ngăn dọc giữa các ô */}
            {i > 0 && (
              <div className="absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
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
        ))}
      </div>
    </div>
  );
}
