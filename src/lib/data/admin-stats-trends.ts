import { getUsers, getNews, getSettingsByKeys } from "@/lib/data/content-service";

export type StatsTrends = {
  users: number | null;
  news: number | null;
  events: number | null;
  views: number | null;
};

// % thay đổi. prev=0: có mới -> 100%, không có -> null (ẩn badge)
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

function dateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function sumRange(daily: Record<string, number>, startDaysAgo: number, endDaysAgo: number): number {
  let total = 0;
  for (let i = endDaysAgo; i <= startDaysAgo; i++) total += daily[dateKey(i)] ?? 0;
  return total;
}

/** Tăng trưởng 7 ngày gần nhất so với 7 ngày liền trước cho các chỉ số dashboard. */
export async function getStatsTrends(): Promise<StatsTrends> {
  const [users, news, settings] = await Promise.all([
    getUsers().catch(() => []),
    getNews("all").catch(() => []),
    // analytics.daily_views nằm ngoài getSettings() (blob nặng), lấy riêng.
    getSettingsByKeys(["analytics.daily_views"]).catch(() => []),
  ]);

  const now = Date.now();
  const DAY = 86_400_000;
  const inWindow = (dateStr: string | undefined, from: number, to: number) => {
    if (!dateStr) return false;
    const age = now - new Date(dateStr).getTime();
    return age >= from && age < to;
  };
  const growth = <T,>(items: T[], getDate: (i: T) => string | undefined): number | null => {
    const cur = items.filter((i) => inWindow(getDate(i), 0, 7 * DAY)).length;
    const prev = items.filter((i) => inWindow(getDate(i), 7 * DAY, 14 * DAY)).length;
    return pct(cur, prev);
  };

  const usersTrend = growth(users, (u) => u.created_at);
  const newsTrend = growth(news, (n) => n.created_at);

  let daily: Record<string, number> = {};
  const raw = settings.find((s) => s.key === "analytics.daily_views")?.value;
  if (raw) {
    try { daily = JSON.parse(raw) as Record<string, number>; } catch { daily = {}; }
  }
  const viewsTrend = pct(sumRange(daily, 6, 0), sumRange(daily, 13, 7));

  return { users: usersTrend, news: newsTrend, events: null, views: viewsTrend };
}
