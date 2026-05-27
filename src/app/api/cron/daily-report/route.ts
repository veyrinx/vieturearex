import { NextRequest, NextResponse } from "next/server";
import { getSettings, getDashboardStats } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification } from "@/lib/server/discord-notify";

const DAILY_KEY             = "analytics.daily_views";
const SCHEDULE_HOUR_KEY     = "integrations.report_schedule_hour";
const SCHEDULE_INTERVAL_KEY = "integrations.report_schedule_interval";
const SCHEDULE_DAYS_KEY     = "integrations.report_schedule_days";
const TG_HOUR_KEY           = "integrations.telegram_report_hour";
const DISCORD_HOUR_KEY      = "integrations.discord_report_hour";

function vnHourNow(): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false,
  }).format(new Date());
  const n = parseInt(s);
  return n === 24 ? 0 : n;
}

function vnWeekdayNow(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).getDay();
}

type Setting = { key: string; value: string };

function isDayAllowed(settings: Setting[]): boolean {
  const daysRaw = settings.find((s) => s.key === SCHEDULE_DAYS_KEY)?.value ?? "";
  if (!daysRaw) return true;
  const allowed = daysRaw.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d));
  return allowed.length === 0 || allowed.includes(vnWeekdayNow());
}

function shouldChannelSend(settings: Setting[], channelHourKey: string, force: boolean): boolean {
  if (force) return true;
  if (!isDayAllowed(settings)) return false;

  const globalHour = parseInt(settings.find((s) => s.key === SCHEDULE_HOUR_KEY)?.value ?? "8");
  const interval   = parseInt(settings.find((s) => s.key === SCHEDULE_INTERVAL_KEY)?.value ?? "24");
  const raw        = settings.find((s) => s.key === channelHourKey)?.value;
  const hour       = raw ? parseInt(raw) : globalHour;
  const current    = vnHourNow();

  if (interval <= 1) return true;
  if (interval >= 24) return current === hour;
  return current % interval === hour % interval;
}

function vnDateKey(daysAgo = 0) {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 7);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function getTodayStats() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { newUsers: 0, newNews: 0, newEvents: 0, pendingComments: 0 };

  const todayStart = `${vnDateKey(0)}T00:00:00+07:00`;

  const [usersRes, newsRes, eventsRes, commentsRes] = await Promise.allSettled([
    (supabase.from("users") as ReturnType<typeof supabase.from>)
      .select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    (supabase.from("news") as ReturnType<typeof supabase.from>)
      .select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    (supabase.from("events") as ReturnType<typeof supabase.from>)
      .select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    (supabase.from("news_comments") as ReturnType<typeof supabase.from>)
      .select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    newUsers:        usersRes.status === "fulfilled"    ? ((usersRes.value as { count: number | null }).count ?? 0)    : 0,
    newNews:         newsRes.status === "fulfilled"     ? ((newsRes.value as { count: number | null }).count ?? 0)     : 0,
    newEvents:       eventsRes.status === "fulfilled"   ? ((eventsRes.value as { count: number | null }).count ?? 0)   : 0,
    pendingComments: commentsRes.status === "fulfilled" ? ((commentsRes.value as { count: number | null }).count ?? 0) : 0,
  };
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.headers.get("x-force-report") === "1";

  const [stats, settings, todayStats] = await Promise.all([
    getDashboardStats(),
    getSettings(),
    getTodayStats(),
  ]);

  const telegramEnabled = settings.find((s) => s.key === "integrations.telegram_daily_report")?.value !== "false"
                          && shouldChannelSend(settings, TG_HOUR_KEY, force);
  const discordEnabled  = settings.find((s) => s.key === "integrations.discord_daily_report")?.value === "true"
                          && shouldChannelSend(settings, DISCORD_HOUR_KEY, force);

  if (!telegramEnabled && !discordEnabled) {
    return NextResponse.json({ ok: true, sent: false, reason: "not_scheduled_or_disabled", hour: vnHourNow() });
  }

  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today     = daily[vnDateKey(0)] ?? 0;
  const yesterday = daily[vnDateKey(1)] ?? 0;
  const last7     = Array.from({ length: 7 }, (_, i) => daily[vnDateKey(i)] ?? 0).reduce((a, b) => a + b, 0);
  const diff      = today - yesterday;
  const trend     = diff > 0 ? `📈 +${diff.toLocaleString("vi-VN")}` : diff < 0 ? `📉 ${diff.toLocaleString("vi-VN")}` : "➖ Không đổi";

  const payload = {
    title: `📊 BÁO CÁO NGÀY — ${vnDateKey(0)}`,
    subtitle: `Tổng hợp tự động lúc ${vnNow()} (ICT)`,
    sections: [
      {
        icon: "👁️",
        heading: "Lượt xem hôm nay",
        rows: [
          { label: "Hôm nay", value: today.toLocaleString("vi-VN"), bold: true },
          { label: "So hôm qua", value: trend },
          { label: "Hôm qua", value: yesterday.toLocaleString("vi-VN") },
          { label: "7 ngày gần nhất", value: last7.toLocaleString("vi-VN") },
        ],
      },
      {
        icon: "🆕",
        heading: "Hoạt động hôm nay",
        rows: [
          { label: "User mới", value: todayStats.newUsers.toLocaleString("vi-VN"), bold: todayStats.newUsers > 0 },
          { label: "Bài viết mới", value: todayStats.newNews.toLocaleString("vi-VN"), bold: todayStats.newNews > 0 },
          { label: "Sự kiện mới", value: todayStats.newEvents.toLocaleString("vi-VN"), bold: todayStats.newEvents > 0 },
          ...(todayStats.pendingComments > 0
            ? [{ label: "Bình luận chờ duyệt", value: todayStats.pendingComments.toLocaleString("vi-VN"), status: "warn" as const }]
            : []),
        ],
      },
      {
        icon: "📈",
        heading: "Tổng quan hệ thống",
        rows: [
          { label: "Tổng lượt xem", value: stats.views.toLocaleString("vi-VN") },
          { label: "Người dùng", value: stats.users.toLocaleString("vi-VN") },
          { label: "Sự kiện", value: stats.events.toLocaleString("vi-VN") },
          { label: "Bài viết", value: stats.news.toLocaleString("vi-VN") },
        ],
      },
    ],
    footer: "📊 Arex Auto-Report",
  };

  const [telegramResult, discordResult] = await Promise.all([
    telegramEnabled ? sendTelegramNotification(payload)         : Promise.resolve({ sent: false }),
    discordEnabled  ? sendDiscordInternalNotification(payload)  : Promise.resolve({ sent: false }),
  ]);

  return NextResponse.json({
    ok: true,
    sent: telegramResult.sent || discordResult.sent,
    telegram: telegramResult.sent,
    discord: discordResult.sent,
    today,
    yesterday,
    last7,
    todayStats,
  });
}
