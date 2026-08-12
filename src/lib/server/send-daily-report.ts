import "server-only";
import { getSettings, getSettingsByKeys, getDashboardStats } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification } from "@/lib/server/discord-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";
import { vnDateKey, vnHourNow, vnWeekdayNow } from "@/lib/server/vn-date";
import { getAuthStats, hasAuthActivity, type AuthStats } from "@/lib/server/auth-stats";

export { vnDateKey };

const DAILY_KEY             = "analytics.daily_views";
const SCHEDULE_HOUR_KEY     = "integrations.report_schedule_hour";
const SCHEDULE_INTERVAL_KEY = "integrations.report_schedule_interval";
const SCHEDULE_DAYS_KEY     = "integrations.report_schedule_days";
const SKIP_EMPTY_KEY        = "integrations.report_skip_when_idle";
const TG_HOUR_KEY           = "integrations.telegram_report_hour";
const DISCORD_HOUR_KEY      = "integrations.discord_report_hour";
const LARK_HOUR_KEY         = "integrations.lark_report_hour";

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
    newUsers:        usersRes.status === "fulfilled"    ? ((usersRes.value as { count: number | null }).count ?? 0) : 0,
    newNews:         newsRes.status === "fulfilled"     ? ((newsRes.value as { count: number | null }).count ?? 0)  : 0,
    newEvents:       eventsRes.status === "fulfilled"   ? ((eventsRes.value as { count: number | null }).count ?? 0): 0,
    pendingComments: commentsRes.status === "fulfilled" ? ((commentsRes.value as { count: number | null }).count ?? 0): 0,
  };
}

export type DailyReportResult = {
  ok: boolean;
  sent: boolean;
  telegram: boolean;
  discord: boolean;
  lark: boolean;
  reason?: string;
  error?: string;
  today?: number;
  yesterday?: number;
  last7?: number;
  hour?: number;
};

/** Nhãn hiển thị cho từng phương thức đăng nhập. */
const METHOD_LABELS: Array<[keyof AuthStats["today"]["byMethod"], string]> = [
  ["password", "Mật khẩu"],
  ["google", "Google"],
  ["facebook", "Facebook"],
  ["other", "Khác"],
];

export async function runDailyReport(force = false): Promise<DailyReportResult> {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>;
  let settings: Awaited<ReturnType<typeof getSettings>>;
  let todayStats: Awaited<ReturnType<typeof getTodayStats>>;
  let authStats: AuthStats;

  try {
    [stats, settings, todayStats, authStats] = await Promise.all([
      getDashboardStats(),
      getSettings(),
      getTodayStats(),
      getAuthStats(),
    ]);
  } catch (err) {
    console.error("[daily-report] fetch data failed:", err);
    return { ok: false, sent: false, telegram: false, discord: false, lark: false, error: String(err) };
  }

  const sm = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const hasTgCreds      = !!(sm["integrations.telegram_bot_token"] && sm["integrations.telegram_chat_id"]);
  const hasDiscordCreds = !!sm["integrations.discord_internal_webhook"];
  const hasLarkCreds    = !!sm["integrations.lark_webhook_url"];

  const telegramEnabled = sm["integrations.telegram_daily_report"] !== "false" && hasTgCreds && shouldChannelSend(settings, TG_HOUR_KEY, force);
  const discordEnabled  = sm["integrations.discord_daily_report"] === "true"   && hasDiscordCreds && shouldChannelSend(settings, DISCORD_HOUR_KEY, force);
  const larkEnabled     = sm["integrations.lark_daily_report"] !== "false"     && hasLarkCreds && shouldChannelSend(settings, LARK_HOUR_KEY, force);

  if (!telegramEnabled && !discordEnabled && !larkEnabled) {
    return { ok: true, sent: false, telegram: false, discord: false, lark: false, reason: "not_scheduled_or_disabled", hour: vnHourNow() };
  }

  // DAILY_KEY nằm ngoài getSettings() (blob nặng) — lấy riêng, và chỉ lấy khi
  // thật sự sắp gửi báo cáo.
  const dailySettings = await getSettingsByKeys([DAILY_KEY]).catch(() => []);
  const dailyRaw = dailySettings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today     = daily[vnDateKey(0)] ?? 0;
  const yesterday = daily[vnDateKey(1)] ?? 0;
  const last7     = Array.from({ length: 7 }, (_, i) => daily[vnDateKey(i)] ?? 0).reduce((a, b) => a + b, 0);
  const diff      = today - yesterday;
  const trend     = diff > 0 ? `📈 +${diff.toLocaleString("vi-VN")}` : diff < 0 ? `📉 ${diff.toLocaleString("vi-VN")}` : "➖ Không đổi";

  // Ngày không có gì xảy ra thì không gửi (bật/tắt bằng integrations.report_skip_when_idle,
  // mặc định BẬT). force=1 vẫn gửi để admin bấm test được.
  const skipWhenIdle = sm[SKIP_EMPTY_KEY] !== "false";
  const idle =
    today === 0 &&
    todayStats.newUsers === 0 &&
    todayStats.newNews === 0 &&
    todayStats.newEvents === 0 &&
    todayStats.pendingComments === 0 &&
    !hasAuthActivity(authStats);
  if (!force && skipWhenIdle && idle) {
    return { ok: true, sent: false, telegram: false, discord: false, lark: false, reason: "no_activity", hour: vnHourNow() };
  }

  const payload = {
    title: `📊 BÁO CÁO NGÀY — ${vnDateKey(0)}`,
    subtitle: `Tổng hợp tự động lúc ${vnNow()} (ICT)`,
    sections: [
      {
        icon: "👁️",
        heading: "Lượt xem hôm nay",
        rows: [
          { label: "Hôm nay",           value: today.toLocaleString("vi-VN"),     bold: true },
          { label: "So hôm qua",        value: trend },
          { label: "Hôm qua",           value: yesterday.toLocaleString("vi-VN") },
          { label: "7 ngày gần nhất",   value: last7.toLocaleString("vi-VN") },
        ],
      },
      {
        icon: "🆕",
        heading: "Hoạt động hôm nay",
        rows: [
          { label: "User mới",           value: todayStats.newUsers.toLocaleString("vi-VN"),        bold: todayStats.newUsers > 0 },
          { label: "Bài viết mới",       value: todayStats.newNews.toLocaleString("vi-VN"),         bold: todayStats.newNews > 0 },
          { label: "Sự kiện mới",        value: todayStats.newEvents.toLocaleString("vi-VN"),       bold: todayStats.newEvents > 0 },
          ...(todayStats.pendingComments > 0
            ? [{ label: "Bình luận chờ duyệt", value: todayStats.pendingComments.toLocaleString("vi-VN"), status: "warn" as const }]
            : []),
        ],
      },
      {
        icon: "🔐",
        heading: "Đăng nhập hôm nay",
        rows: [
          {
            label: "Tổng lượt",
            value: `${authStats.today.total.toLocaleString("vi-VN")} (${authStats.today.uniqueUsers.toLocaleString("vi-VN")} tài khoản)`,
            bold: authStats.today.total > 0,
          },
          ...METHOD_LABELS
            .filter(([key]) => authStats.today.byMethod[key] > 0)
            .map(([key, label]) => ({
              label,
              value: authStats.today.byMethod[key].toLocaleString("vi-VN"),
            })),
          ...(authStats.blockedIpsToday > 0
            ? [{ label: "IP bị chặn", value: authStats.blockedIpsToday.toLocaleString("vi-VN"), status: "warn" as const }]
            : []),
        ],
      },
      {
        icon: "📈",
        heading: "Tổng quan hệ thống",
        rows: [
          { label: "Tổng lượt xem", value: stats.views.toLocaleString("vi-VN") },
          { label: "Người dùng",    value: stats.users.toLocaleString("vi-VN") },
          { label: "Sự kiện",       value: stats.events.toLocaleString("vi-VN") },
          { label: "Bài viết",      value: stats.news.toLocaleString("vi-VN") },
        ],
      },
    ],
    footer: "📊 Arex Auto-Report",
  };

  const [telegramResult, discordResult, larkResult] = await Promise.allSettled([
    telegramEnabled ? sendTelegramNotification(payload)        : Promise.resolve({ sent: false }),
    discordEnabled  ? sendDiscordInternalNotification(payload) : Promise.resolve({ sent: false }),
    larkEnabled     ? sendLarkNotification(payload)            : Promise.resolve({ sent: false }),
  ]);

  const tg = telegramResult.status === "fulfilled" ? telegramResult.value : { sent: false };
  const dc = discordResult.status  === "fulfilled" ? discordResult.value  : { sent: false };
  const lk = larkResult.status     === "fulfilled" ? larkResult.value     : { sent: false };

  return {
    ok: true,
    sent: tg.sent || dc.sent || lk.sent,
    telegram: tg.sent,
    discord: dc.sent,
    lark: lk.sent,
    today,
    yesterday,
    last7,
  };
}
