"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Gift, Zap, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

// Bậc thưởng theo chu kỳ 7 ngày (thiết kế cố định).
const REWARDS = [
  { day: 1, label: "+2 Điểm" },
  { day: 2, label: "+2 Điểm" },
  { day: 3, label: "Chuỗi 3 ngày" },
  { day: 4, label: "+2 Điểm" },
  { day: 5, label: "+2 Điểm" },
  { day: 6, label: "Chuỗi 6 ngày" },
  { day: 7, label: "Mốc 7 ngày" },
];

type State = { loggedIn: boolean; streak: number; alreadyCheckedIn: boolean };

export function DailyCheckin() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/user/checkin", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d ? { loggedIn: !!d.loggedIn, streak: d.streak ?? 0, alreadyCheckedIn: !!d.alreadyCheckedIn } : { loggedIn: false, streak: 0, alreadyCheckedIn: false }))
      .catch(() => setState({ loggedIn: false, streak: 0, alreadyCheckedIn: false }));
  }, []);

  async function handleCheckin() {
    if (!state || state.alreadyCheckedIn || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/checkin", { method: "POST", credentials: "same-origin" });
      const d = await res.json().catch(() => null);
      if (d?.ok) setState((s) => (s ? { ...s, streak: d.streak ?? s.streak, alreadyCheckedIn: true } : s));
    } finally {
      setBusy(false);
    }
  }

  const streak = state?.streak ?? 0;
  const done = state?.alreadyCheckedIn ?? false;
  // Vị trí trong chu kỳ 7 ngày hiện tại.
  const cyclePos = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const todayDay = done ? cyclePos : (cyclePos % 7) + 1;

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
        {REWARDS.map((reward) => {
          const d = reward.day;
          const isClaimed = d <= cyclePos;
          const isToday = state?.loggedIn && !done && d === todayDay;
          const isFuture = !isClaimed && !isToday;

          return (
            <div
              key={reward.day}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all",
                isClaimed && "border-green-500/30 bg-green-500/10 opacity-60",
                isToday && "cursor-pointer border-primary/50 bg-primary/10 ring-2 ring-primary/30",
                isFuture && "border-dashed border-border/70 bg-muted/30",
              )}
              onClick={isToday ? handleCheckin : undefined}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ngày {d}
              </p>
              <div className="flex size-8 items-center justify-center">
                {isClaimed ? (
                  <Check className="size-5 text-green-500" />
                ) : (
                  <Gift className={cn("size-6", isToday ? "text-primary" : "text-muted-foreground/50", d === 7 && "text-amber-500")} />
                )}
              </div>
              <p
                className={cn(
                  "h-6 text-[9px] font-semibold leading-tight",
                  isClaimed ? "text-green-600" : "text-muted-foreground",
                  isToday && "text-primary",
                  d === 7 && !isClaimed && "text-amber-600",
                )}
              >
                {reward.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {state === null ? (
          <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải…
          </button>
        ) : !state.loggedIn ? (
          <Link
            href="/login?next=/"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <LogIn className="size-4" /> Đăng nhập để điểm danh
          </Link>
        ) : (
          <button
            onClick={handleCheckin}
            disabled={done || busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {done ? `Đã điểm danh hôm nay (chuỗi ${streak} ngày)` : "Điểm danh hôm nay"}
          </button>
        )}
      </div>
    </div>
  );
}
