import { NextRequest, NextResponse } from "next/server";
import { getSettingsByKeys } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

const DAILY_KEY = "analytics.daily_views";

function dateKey(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function sumRange(daily: Record<string, number>, startDaysAgo: number, endDaysAgo: number) {
  let total = 0;
  for (let i = endDaysAgo; i <= startDaysAgo; i++) {
    total += daily[dateKey(i)] ?? 0;
  }
  return total;
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "analytics-trends", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const settings = await getSettingsByKeys([DAILY_KEY]);
  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today = daily[dateKey(0)] ?? 0;
  const yesterday = daily[dateKey(1)] ?? 0;

  const weekCurrent = sumRange(daily, 6, 0);
  const weekPrev = sumRange(daily, 13, 7);

  const monthCurrent = sumRange(daily, 29, 0);
  const monthPrev = sumRange(daily, 59, 30);

  const trend = (curr: number, prev: number) =>
    curr > prev ? "up" : curr < prev ? "down" : "same";

  // Last 30 days for chart
  const chart: Array<{ date: string; views: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const k = dateKey(i);
    chart.push({ date: k, views: daily[k] ?? 0 });
  }

  return NextResponse.json({
    today,
    yesterday,
    todayTrend: trend(today, yesterday),
    weekCurrent,
    weekPrev,
    weekTrend: trend(weekCurrent, weekPrev),
    monthCurrent,
    monthPrev,
    monthTrend: trend(monthCurrent, monthPrev),
    chart,
  });
}
