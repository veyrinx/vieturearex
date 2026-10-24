import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";

/**
 * Giám sát sức khoẻ server dùng chung cho bot Zalo + Telegram.
 * - /ping: đo độ trễ xử lý + uptime tiến trình.
 * - /status|trangthai: tổng quan web + database, tự phát hiện quá tải/DDoS.
 * - Auto-reply khi sập: bot gắn cảnh báo vào câu trả lời khi hệ thống degraded.
 */

export type ServerHealth = {
  ok: boolean;
  degraded: boolean;
  latencyMs: number;
  uptimeSec: number;
  dbOk: boolean | null;
  dbLatencyMs: number | null;
  reason: string | null;
  checkedAt: string;
};

const CACHE_TTL_MS = 45_000;
let cache: { health: ServerHealth; expires: number } | null = null;
const bootAt = Date.now();

/** Ngưỡng coi như đang bị DDoS / quá tải. */
const SLOW_DB_MS = 4000;
const SLOW_TOTAL_MS = 6000;

export async function checkServerHealth(force = false): Promise<ServerHealth> {
  const now = Date.now();
  if (!force && cache && now < cache.expires) return cache.health;

  const started = Date.now();
  let dbOk: boolean | null = null;
  let dbLatencyMs: number | null = null;
  let reason: string | null = null;

  try {
    const db = createAdminSupabaseClient();
    if (!db) {
      reason = "Không khởi tạo được database client";
    } else {
      const t0 = Date.now();
      const { error } = await untypedFrom(db, "settings")
        .select("key")
        .limit(1)
        .maybeSingle();
      dbLatencyMs = Date.now() - t0;
      if (error) {
        dbOk = false;
        reason = `Database lỗi: ${error.message?.slice(0, 120) || "unknown"}`;
      } else {
        dbOk = true;
        if (dbLatencyMs > SLOW_DB_MS) reason = `Database phản hồi chậm (${dbLatencyMs}ms) — có thể đang bị quá tải/DDoS`;
      }
    }
  } catch (err) {
    dbOk = false;
    reason = `Không nối được database (${err instanceof Error ? err.message.slice(0, 120) : "network"})`;
  }

  const latencyMs = Date.now() - started;
  if (!reason && latencyMs > SLOW_TOTAL_MS) {
    reason = `Server phản hồi chậm (${latencyMs}ms) — có thể đang bị DDoS/quá tải`;
  }

  const health: ServerHealth = {
    ok: dbOk !== false && !reason,
    degraded: dbOk === false || reason !== null,
    latencyMs,
    uptimeSec: 0,
    dbOk,
    dbLatencyMs,
    reason,
    checkedAt: new Date().toISOString(),
  };
  // Uptime thực của tiến trình.
  health.uptimeSec = Math.floor(process.uptime?.() ?? (Date.now() - bootAt) / 1000);
  cache = { health, expires: now + CACHE_TTL_MS };
  return health;
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Lệnh ping — nhẹ, không chạm DB, đo ngay tại tiến trình bot. */
export function formatPingReply(pingMs: number, uptimeSec: number, html: boolean): string {
  const up = fmtUptime(uptimeSec);
  const verdict = pingMs < 800 ? "Ổn định" : pingMs < 2500 ? "Hơi chậm" : "Quá tải";
  if (html) {
    return `🏓 <b>Pong!</b> <code>${pingMs}ms</code> — ${verdict}\n⏱ Uptime: <b>${up}</b>`;
  }
  return `🏓 Pong! ${pingMs}ms — ${verdict}\n⏱ Uptime: ${up}`;
}

/** Lệnh status/trangthai — chi tiết cho admin, gọn cho user thường. */
export function formatStatusReply(h: ServerHealth, isAdmin: boolean, html: boolean): string {
  const up = fmtUptime(h.uptimeSec);
  const icon = h.degraded ? "🔴" : "🟢";
  const state = h.degraded ? "ĐANG GẶP SỰ CỐ" : "HOẠT ĐỘNG ỔN ĐỊNH";
  if (html) {
    const lines = [
      `${icon} <b>Server: ${state}</b>`,
      `⏱ Uptime: <b>${up}</b> · Xử lý: <code>${h.latencyMs}ms</code>`,
      h.dbLatencyMs !== null
        ? `🗄 Database: <b>${h.dbOk ? "OK" : "LỖI"}</b> (<code>${h.dbLatencyMs}ms</code>)`
        : `🗄 Database: <i>chưa kiểm tra</i>`,
    ];
    if (h.reason) lines.push(`\n⚠️ <i>${h.reason}</i>`);
    if (h.degraded) {
      lines.push(`\n🛡 Bot vẫn trực. Web/điểm danh có thể chậm — thử lại sau ít phút.`);
    } else if (!isAdmin) {
      lines.push(`\n✅ Mọi hệ thống bình thường.`);
    }
    if (isAdmin) lines.push(`\n<i>Kiểm tra lúc ${h.checkedAt} · cache 45s · /ping để đo nhanh</i>`);
    return lines.join("\n");
  }
  const lines = [
    `${icon} Server: ${state}`,
    `⏱ Uptime: ${up} · Xử lý: ${h.latencyMs}ms`,
    h.dbLatencyMs !== null ? `🗄 Database: ${h.dbOk ? "OK" : "LOI"} (${h.dbLatencyMs}ms)` : `🗄 Database: chua kiem tra`,
  ];
  if (h.reason) lines.push(`\n⚠️ ${h.reason}`);
  if (h.degraded) lines.push(`\n🛡 Bot van truc. Web/diem danh co the cham — thu lai sau it phut.`);
  return lines.join("\n");
}

/** Cảnh báo ngắn tự gắn vào câu trả lời khi server degraded (chống DDoS/sập). */
export function degradedNoticeHtml(h: ServerHealth | null): string {
  if (!h?.degraded) return "";
  return `\n\n⚠️ <i>Server đang chập chờn (có thể bị DDoS/quá tải) — bot trả lời chậm, web có thể khó vào. Đội ngũ đã được báo, bạn thử lại sau ít phút.</i>`;
}

export function degradedNoticeText(h: ServerHealth | null): string {
  if (!h?.degraded) return "";
  return `\n\n⚠️ Server dang chap chon (co the bi DDoS/qua tai) — bot tra loi cham, web co the kho vao. Thu lai sau it phut.`;
}

/** Telegram: chat admin = chat id cấu hình trong settings. */
export async function isTelegramAdmin(chatId: number | string): Promise<boolean> {
  try {
    const settings = await getSettings().catch(() => []);
    const adminChatId = settings.find((s) => s.key === "integrations.telegram_chat_id")?.value ?? "";
    return adminChatId !== "" && String(chatId) === String(adminChatId).trim();
  } catch {
    return false;
  }
}

const ADMIN_ROLES = new Set(["super_admin", "admin", "it", "manager", "support"]);

/** Zalo: admin = tài khoản đã liên kết có role quản trị. */
export async function isZaloAdmin(zaloUserId: string): Promise<boolean> {
  if (!zaloUserId) return false;
  try {
    const db = createAdminSupabaseClient();
    if (!db) return false;
    const { data: link } = (await untypedFrom(db, "zalo_account_links")
      .select("user_id")
      .eq("zalo_user_id", zaloUserId)
      .maybeSingle()) as { data: { user_id: string } | null };
    if (!link?.user_id) return false;
    const { data: u } = (await untypedFrom(db, "users")
      .select("role")
      .eq("id", link.user_id)
      .maybeSingle()) as { data: { role: string | null } | null };
    return !!u?.role && ADMIN_ROLES.has(u.role);
  } catch {
    return false;
  }
}

// ── Cảnh báo DDoS/sập chủ động (cron server-watch gọi) ──────────────────────
// Chỉ nhắn khi ĐỔI TRẠNG THÁI (ổn định → sự cố, sự cố → hồi phục) và giãn cách
// tối thiểu giữa 2 lần báo để không spam nhóm admin khi server chập chờn.

const WATCH_STATE_KEY = "ops.server_watch_last_state";
const WATCH_ALERT_AT_KEY = "ops.server_watch_last_alert_at";
const WATCH_MIN_GAP_MS = 15 * 60_000;

export type WatchResult = {
  ok: boolean;
  state: "up" | "down";
  changed: boolean;
  alerted: boolean;
  health: ServerHealth;
};

async function sendTelegramAdminAlert(html: string): Promise<boolean> {
  try {
    const settings = await getSettings().catch(() => []);
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
    const rawToken = get("integrations.telegram_bot_token");
    const token = rawToken.startsWith("enc:") ? "" : rawToken;
    const chatId = get("integrations.telegram_chat_id").trim();
    if (!token || !chatId) return false;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => null);
    return !!res?.ok;
  } catch {
    return false;
  }
}

/**
 * Cron 5 phút/lần: kiểm tra sức khoẻ, nhắn Telegram admin + Zalo khi sập/hồi phục.
 * Nhớ trạng thái vào settings nên nhiều máy cùng chạy cũng không báo trùng.
 */
export async function checkAndAlertServerStatus(): Promise<WatchResult> {
  const health = await checkServerHealth(true);
  const state: "up" | "down" = health.degraded ? "down" : "up";

  const { getSettingsByKeys, updateSetting } = await import("@/lib/data/content-service");
  const rows = await getSettingsByKeys([WATCH_STATE_KEY, WATCH_ALERT_AT_KEY]).catch(() => []);
  const prev = rows.find((s) => s.key === WATCH_STATE_KEY)?.value === "down" ? "down" : "up";
  const lastAlertAt = Number(rows.find((s) => s.key === WATCH_ALERT_AT_KEY)?.value ?? 0) || 0;
  const changed = state !== prev;
  const gapOk = Date.now() - lastAlertAt > WATCH_MIN_GAP_MS;

  let alerted = false;
  if ((changed || (state === "down" && gapOk)) && gapOk) {
    const icon = state === "down" ? "🚨" : "✅";
    const title = state === "down" ? "SERVER GẶP SỰ CỐ" : "SERVER ĐÃ HỒI PHỤC";
    const detail = state === "down"
      ? (health.reason ?? "Không rõ nguyên nhân")
      : `Uptime ${fmtUptime(health.uptimeSec)} · DB ${health.dbLatencyMs ?? "?"}ms`;
    const html = `${icon} <b>${title}</b>\n${detail}\n<i>${health.checkedAt}</i>`;
    const tgOk = await sendTelegramAdminAlert(html);
    let zaloOk = false;
    try {
      const { broadcastZaloBot } = await import("@/lib/server/zalo-broadcast");
      const plain = html.replace(/<[^>]+>/g, "");
      const r = await broadcastZaloBot({ text: `${icon} ${title}\n${plain}`, target: "configured" });
      zaloOk = r.sent > 0;
    } catch {
      zaloOk = false;
    }
    alerted = tgOk || zaloOk;
    if (alerted) {
      await updateSetting(WATCH_ALERT_AT_KEY, String(Date.now())).catch(() => null);
    }
  }

  if (changed || alerted) {
    await updateSetting(WATCH_STATE_KEY, state).catch(() => null);
    cache = { health, expires: Date.now() + CACHE_TTL_MS };
  }
  return { ok: true, state, changed, alerted, health };
}
