"use client";

import { useDailyCheckin } from "@/hooks/use-daily-checkin";

export function DailyCheckinTrigger() {
  useDailyCheckin();
  return null;
}
