import { NextRequest, NextResponse } from "next/server";
import { getSettings, getDashboardStats } from "@/lib/data/content-service";
import { sendLarkNotification } from "@/lib/server/lark-notify";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification } from "@/lib/server/discord-notify";

const DAILY_KEY = "analytics.daily_views";
const SCHEDULE_HOUR_KEY     = "integrations.report_schedule_hour";
const SCHEDULE_INTERVAL_KEY = "integrations.report_schedule_interval";

function vnHourNow(): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const n = parseInt(s);
  return n === 24 ? 0 : n;
}

function shouldSendNow(settings: { key: string; value: string }[]): boolean {
  const hour     = parseInt(settings.find((s) => s.key === SCHEDULE_HOUR_KEY)?.value ?? "8");
  const interval = parseInt(settings.find((s) => s.key === SCHEDULE_INTERVAL_KEY)?.value ?? "24");
  const current  = vnHourNow();
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

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, settings] = await Promise.all([getDashboardStats(), getSettings()]);

  if (!shouldSendNow(settings)) {
    return NextResponse.json({ ok: true, sent: false, reason: "not_scheduled_hour", hour: vnHourNow() });
  }

  const larkEnabled     = settings.find((s) => s.key === "integrations.lark_daily_report")?.value !== "false";
  const telegramEnabled = settings.find((s) => s.key === "integrations.telegram_daily_report")?.value !== "false";
  const discordEnabled  = settings.find((s) => s.key === "integrations.discord_daily_report")?.value === "true";
  if (!larkEnabled && !telegramEnabled && !discordEnabled) {
    return NextResponse.json({ ok: true, sent: false, reason: "disabled" });
  }

  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today = daily[vnDateKey(0)] ?? 0;
  const yesterday = daily[vnDateKey(1)] ?? 0;
  const last7 = Array.from({ length: 7 }, (_, i) => daily[vnDateKey(i)] ?? 0).reduce((a, b) => a + b, 0);
  const diff = today - yesterday;
  const trend = diff > 0 ? `📈 +${diff.toLocaleString("vi-VN")}` : diff < 0 ? `📉 ${diff.toLocaleString("vi-VN")}` : "➖ Không đổi";

  const payload = {
    title: `📊 BÁO CÁO NGÀY — ${vnDateKey(0)}`,
    subtitle: `Tổng hợp tự động lúc ${vnNow()} (ICT)`,
    sections: [
      {
        icon: "👁️",
        heading: "Lượt xem",
        rows: [
          { label: "Hôm nay", value: today.toLocaleString("vi-VN"), bold: true },
          { label: "So hôm qua", value: trend },
          { label: "Hôm qua", value: yesterday.toLocaleString("vi-VN") },
          { label: "7 ngày gần nhất", value: last7.toLocaleString("vi-VN") },
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
    footer: "🤖 Arex Auto-Report",
  };

  const [larkResult, telegramResult, discordResult] = await Promise.all([
    larkEnabled ? sendLarkNotification(payload) : Promise.resolve({ sent: false }),
    telegramEnabled ? sendTelegramNotification(payload) : Promise.resolve({ sent: false }),
    discordEnabled ? sendDiscordInternalNotification(payload) : Promise.resolve({ sent: false }),
  ]);

  return NextResponse.json({
    ok: true,
    sent: larkResult.sent || telegramResult.sent || discordResult.sent,
    lark: larkResult.sent,
    telegram: telegramResult.sent,
    discord: discordResult.sent,
    today,
    yesterday,
    last7,
  });
}
