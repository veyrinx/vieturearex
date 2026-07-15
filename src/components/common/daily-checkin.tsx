"use client";

import { useState } from "react";
import { Check, Gift, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_REWARDS = [
  { day: 1, points: 10, label: "+10 Điểm" },
  { day: 2, points: 15, label: "+15 Điểm" },
  { day: 3, points: 20, label: "Hộp quà nhỏ" },
  { day: 4, points: 25, label: "+25 Điểm" },
  { day: 5, points: 30, label: "+30 Điểm" },
  { day: 6, points: 40, label: "Hộp quà vừa" },
  { day: 7, points: 100, label: "Rương Huyền Thoại" },
];

/**
 * Module điểm danh 7 ngày, tạo thói quen quay lại cho người dùng.
 * Dữ liệu streak và trạng thái đã nhận cần được lấy từ API.
 * Đây là phiên bản UI với dữ liệu giả lập.
 */
export function DailyCheckin() {
  // Dữ liệu giả lập: người dùng đã điểm danh 3 ngày.
  const [streak, setStreak] = useState(3);
  const [claimedToday, setClaimedToday] = useState(true);

  const handleCheckin = () => {
    if (claimedToday) return;
    // Gọi API điểm danh ở đây
    setStreak((s) => s + 1);
    setClaimedToday(true);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
            Điểm Danh Hằng Ngày
          </h3>
          <p className="text-xs text-muted-foreground">
            Chuỗi hiện tại: <span className="font-bold text-primary">{streak} ngày</span>
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Zap className="size-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {MOCK_REWARDS.map((reward, index) => {
          const dayIndex = index + 1;
          const isClaimed = dayIndex <= streak;
          const isToday = dayIndex === streak + 1;
          const isFuture = dayIndex > streak + 1;

          return (
            <div
              key={reward.day}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all",
                isClaimed && "border-green-500/30 bg-green-500/10 opacity-60",
                isToday && !claimedToday && "cursor-pointer border-primary/50 bg-primary/10 ring-2 ring-primary/30",
                isToday && claimedToday && "border-primary/50 bg-primary/10",
                isFuture && "border-dashed border-border/70 bg-muted/30",
              )}
              onClick={isToday ? handleCheckin : undefined}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ngày {dayIndex}
              </p>
              <div className="flex size-8 items-center justify-center">
                {isClaimed ? (
                  <Check className="size-5 text-green-500" />
                ) : (
                  <Gift
                    className={cn(
                      "size-6",
                      isToday ? "text-primary" : "text-muted-foreground/50",
                      dayIndex === 7 && "text-amber-500",
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "h-6 text-[9px] font-semibold leading-tight",
                  isClaimed ? "text-green-600" : "text-muted-foreground",
                  isToday && "text-primary",
                  dayIndex === 7 && !isClaimed && "text-amber-600",
                )}
              >
                {reward.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          onClick={handleCheckin}
          disabled={claimedToday}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {claimedToday ? `Đã điểm danh hôm nay (chuỗi ${streak} ngày)` : `Nhận thưởng ngày ${streak + 1}`}
        </button>
      </div>
    </div>
  );
}