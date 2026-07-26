import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { sendTelegramNotification, vnNow, type NotifyRow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification } from "@/lib/server/discord-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";
import { getAuthStats, hasAuthActivity, type AuthStats, type LoginMethod } from "@/lib/server/auth-stats";
import { vnDateKey } from "@/lib/server/vn-date";

const ENABLED_KEY = "integrations.auth_daily_report";

const METHODS: Array<[LoginMethod, string]> = [
  ["password", "Mật khẩu"],
  ["google", "Google"],
  ["facebook", "Facebook"],
  ["other", "Khác"],
];

export type AuthReportResult = {
  ok: boolean;
  sent: boolean;
  telegram: boolean;
  discord: boolean;
  lark: boolean;
  reason?: string;
  error?: string;
  logins?: number;
  newUsers?: number;
};

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function trendText(today: number, yesterday: number): string {
  const diff = today - yesterday;
  if (diff > 0) return `📈 +${diff.toLocaleString("vi-VN")} so hôm qua (${yesterday.toLocaleString("vi-VN")})`;
  if (diff < 0) return `📉 ${diff.toLocaleString("vi-VN")} so hôm qua (${yesterday.toLocaleString("vi-VN")})`;
  return `➖ Không đổi (${yesterday.toLocaleString("vi-VN")})`;
}

function buildPayload(stats: AuthStats) {
  const loginRows: NotifyRow[] = [
    { label: "Tổng lượt", value: stats.today.total.toLocaleString("vi-VN"), bold: true },
    { label: "Xu hướng", value: trendText(stats.today.total, stats.yesterday.total) },
    { label: "Tài khoản khác nhau", value: stats.today.uniqueUsers.toLocaleString("vi-VN") },
    ...METHODS
      .filter(([key]) => stats.today.byMethod[key] > 0 || stats.yesterday.byMethod[key] > 0)
      .map(([key, label]) => ({
        label,
        value: `${stats.today.byMethod[key].toLocaleString("vi-VN")} · ${pct(stats.today.byMethod[key], stats.today.total)}`,
      })),
  ];
  if (stats.peakHour !== null) {
    loginRows.push({ label: "Giờ cao điểm", value: `${String(stats.peakHour).padStart(2, "0")}:00 (ICT)` });
  }

  const signupRows: NotifyRow[] = [
    { label: "Tài khoản mới", value: stats.newUsers.toLocaleString("vi-VN"), bold: stats.newUsers > 0 },
    ...METHODS
      .filter(([key]) => stats.newUsersByMethod[key] > 0)
      .map(([key, label]) => ({
        label: `↳ ${label}`,
        value: `${stats.newUsersByMethod[key].toLocaleString("vi-VN")} · ${pct(stats.newUsersByMethod[key], stats.newUsers)}`,
      })),
  ];

  const oauthLogins = stats.today.byMethod.google + stats.today.byMethod.facebook;

  return {
    title: `🔐 BÁO CÁO ĐĂNG NHẬP — ${vnDateKey(0)}`,
    subtitle: `Tổng hợp tự động lúc ${vnNow()} (ICT)`,
    sections: [
      { icon: "🔑", heading: "Đăng nhập", rows: loginRows },
      { icon: "🆕", heading: "Đăng ký", rows: signupRows },
      {
        icon: "🛡️",
        heading: "An ninh & tỉ lệ",
        rows: [
          { label: "Qua mạng xã hội", value: `${oauthLogins.toLocaleString("vi-VN")} · ${pct(oauthLogins, stats.today.total)}` },
          {
            label: "IP bị chặn hôm nay",
            value: stats.blockedIpsToday.toLocaleString("vi-VN"),
            ...(stats.blockedIpsToday > 0 ? { status: "warn" as const } : {}),
          },
        ],
      },
    ],
    footer: "🔐 Arex Auth-Report",
  };
}

/**
 * Báo cáo chuyên sâu về đăng nhập / đăng ký. Chạy ké trong cron báo cáo ngày
 * (plan Hobby giới hạn số cron), hoặc gọi thẳng /api/cron/auth-report.
 * Không có hoạt động thì không gửi.
 */
export async function runAuthReport(force = false): Promise<AuthReportResult> {
  let settings: Awaited<ReturnType<typeof getSettings>>;
  let stats: AuthStats;

  try {
    [settings, stats] = await Promise.all([getSettings(), getAuthStats()]);
  } catch (err) {
    console.error("[auth-report] fetch data failed:", err);
    return { ok: false, sent: false, telegram: false, discord: false, lark: false, error: String(err) };
  }

  const sm = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  if (sm[ENABLED_KEY] === "false") {
    return { ok: true, sent: false, telegram: false, discord: false, lark: false, reason: "disabled" };
  }

  if (!force && !hasAuthActivity(stats)) {
    return { ok: true, sent: false, telegram: false, discord: false, lark: false, reason: "no_activity" };
  }

  const telegramEnabled = sm["integrations.telegram_daily_report"] !== "false"
    && !!(sm["integrations.telegram_bot_token"] && sm["integrations.telegram_chat_id"]);
  const discordEnabled  = sm["integrations.discord_daily_report"] === "true"
    && !!sm["integrations.discord_internal_webhook"];
  const larkEnabled     = sm["integrations.lark_daily_report"] !== "false"
    && !!sm["integrations.lark_webhook_url"];

  if (!telegramEnabled && !discordEnabled && !larkEnabled) {
    return { ok: true, sent: false, telegram: false, discord: false, lark: false, reason: "no_channel" };
  }

  const payload = buildPayload(stats);
  const [tgRes, dcRes, lkRes] = await Promise.allSettled([
    telegramEnabled ? sendTelegramNotification(payload)        : Promise.resolve({ sent: false }),
    discordEnabled  ? sendDiscordInternalNotification(payload) : Promise.resolve({ sent: false }),
    larkEnabled     ? sendLarkNotification(payload)            : Promise.resolve({ sent: false }),
  ]);

  const tg = tgRes.status === "fulfilled" ? tgRes.value : { sent: false };
  const dc = dcRes.status === "fulfilled" ? dcRes.value : { sent: false };
  const lk = lkRes.status === "fulfilled" ? lkRes.value : { sent: false };

  return {
    ok: true,
    sent: tg.sent || dc.sent || lk.sent,
    telegram: tg.sent,
    discord: dc.sent,
    lark: lk.sent,
    logins: stats.today.total,
    newUsers: stats.newUsers,
  };
}
