"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Newspaper, Image, Users } from "lucide-react";

type StatItem = {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
};

function CountUp({ target, duration = 1400 }: { target: number; duration?: number }) {
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
};

export function StatsBar({ eventCount, newsCount, galleryCount, memberCount }: StatsBarProps) {
  const stats: StatItem[] = [
    { icon: <CalendarCheck className="size-5 shrink-0" />, value: eventCount, label: "Sự kiện" },
    { icon: <Newspaper className="size-5 shrink-0" />, value: newsCount, label: "Bài viết" },
    { icon: <Image className="size-5 shrink-0" />, value: galleryCount, label: "Ảnh cộng đồng" },
    ...(memberCount !== undefined
      ? [{ icon: <Users className="size-5 shrink-0" />, value: memberCount, suffix: "+", label: "Thành viên" }]
      : []),
  ];

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 border-y border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border/50 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 px-4 py-5 text-center">
            <div className="mb-1 text-primary dark:text-amber-400">{stat.icon}</div>
            <p className="font-heading text-2xl font-extrabold tabular-nums text-foreground md:text-3xl">
              <CountUp target={stat.value} />
              {stat.suffix}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
