"use client";

import { useEffect, useState } from "react";

/**
 * Đồng hồ đếm ngược tới sự kiện kế tiếp, hiển thị trong hero.
 *
 * Tách riêng khỏi <HeroBanner> có lý do hiệu năng chứ không phải để gọn file:
 * đồng hồ này nhảy mỗi giây, mà trước đây state của nó nằm ngay trong hero — tức
 * là mỗi giây React phải dựng lại toàn bộ hero (slider, 14 hạt tàn lửa, mọi khối
 * motion) chỉ để đổi hai chữ số. Giữ state ở component lá thì mỗi nhịp chỉ chạm
 * đúng bốn ô số.
 */

type CountdownUnit = { value: number; label: string };

function unitsFor(targetDate: string): CountdownUnit[] {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return [];
  return [
    { value: Math.floor(diff / 86_400_000), label: "ngày" },
    { value: Math.floor((diff % 86_400_000) / 3_600_000), label: "giờ" },
    { value: Math.floor((diff % 3_600_000) / 60_000), label: "phút" },
    { value: Math.floor((diff % 60_000) / 1000), label: "giây" },
  ];
}

export function HeroCountdown({ target }: { target: string }) {
  // Rỗng ở lần dựng đầu: server không có "bây giờ" giống client, in số ra ngay
  // là cầm chắc lệch hydrate.
  const [units, setUnits] = useState<CountdownUnit[]>([]);

  useEffect(() => {
    const tick = () => setUnits(unitsFor(target));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (units.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
        Sự kiện tiếp theo
      </span>
      <div className="flex gap-1.5">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex min-w-[46px] flex-col items-center rounded-xl border border-primary-on-dark/30 bg-primary-on-dark/[0.16] px-2 py-1.5"
          >
            <span className="font-heading text-base font-black leading-none tabular-nums text-primary-on-dark md:text-lg">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-white/45">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
