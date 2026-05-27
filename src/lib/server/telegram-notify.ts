import "server-only";
import { getSettings } from "@/lib/data/content-service";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotifyRow {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  status?: "ok" | "err" | "warn" | "info";
}

export interface NotifySection {
  icon?: string;
  heading?: string;
  rows: NotifyRow[];
}

export interface NotifyPayload {
  title: string;
  subtitle?: string;
  sections: NotifySection[];
  actions?: Array<{ label: string; url: string }>;
  footer?: string;
}

// ── Internal ──────────────────────────────────────────────────────────────────

const TOKEN_KEY      = "integrations.telegram_bot_token";
const CHAT_KEY       = "integrations.telegram_chat_id";
const USER_TOKEN_KEY = "integrations.telegram_user_bot_token";
const USER_CHAT_KEY  = "integrations.telegram_user_chat_id";

const STATUS_ICON: Record<string, string> = {
  ok: "✅", err: "❌", warn: "⚠️", info: "ℹ️",
};

function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildText(p: NotifyPayload): string {
  const lines: string[] = [];
  lines.push(`<b>${e(p.title)}</b>`);
  if (p.subtitle) lines.push(`<i>${e(p.subtitle)}</i>`);

  for (const sec of p.sections) {
    lines.push("");
    if (sec.heading) {
      const icon = sec.icon ? `${sec.icon} ` : "";
      lines.push(`<b>${icon}${e(sec.heading)}</b>`);
    }
    sec.rows.forEach((row, i) => {
      const last = i === sec.rows.length - 1;
      const prefix = row.status ? `${STATUS_ICON[row.status]} ` : "";
      const val = row.mono
        ? `<code>${e(row.value || "—")}</code>`
        : row.bold
          ? `<b>${e(row.value || "—")}</b>`
          : e(row.value || "—");
      lines.push(`${last ? "┗" : "┣"} ${e(row.label)}: ${prefix}${val}`);
    });
  }

  if (p.actions?.length) {
    lines.push("");
    lines.push(p.actions.map((a) => `<a href="${a.url}">${e(a.label)}</a>`).join("  ·  "));
  }

  if (p.footer) {
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━");
    lines.push(`<i>${e(p.footer)}</i>`);
  }

  return lines.join("\n");
}

async function sendToBot(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (res.ok) return { sent: true };
  const data = (await res.json().catch(() => ({}))) as { description?: string };
  return { sent: false, status: res.status, error: data.description };
}

// ── Exports ───────────────────────────────────────────────────────────────────

/** Bot Admin → gửi vào group/channel nội bộ */
export async function sendTelegramNotification(payload: NotifyPayload) {
  const settings = await getSettings();
  const token  = settings.find((s) => s.key === TOKEN_KEY)?.value || "";
  const chatId = settings.find((s) => s.key === CHAT_KEY)?.value || "";
  if (!token || !chatId) return { sent: false, reason: "not_configured" };
  try { return await sendToBot(token, chatId, buildText(payload)); }
  catch (err) { console.error("[tg-admin]", err); return { sent: false, reason: "fetch_error" }; }
}

/** Bot User → gửi vào channel/nhóm public cho người dùng theo dõi.
 *  Nếu không cấu hình USER_TOKEN_KEY riêng, fallback sang admin bot token. */
export async function sendUserTelegramNotification(payload: NotifyPayload) {
  const settings = await getSettings();
  const userToken  = settings.find((s) => s.key === USER_TOKEN_KEY)?.value || "";
  const adminToken = settings.find((s) => s.key === TOKEN_KEY)?.value || "";
  const token  = userToken || adminToken;
  const chatId = settings.find((s) => s.key === USER_CHAT_KEY)?.value || "";
  if (!token || !chatId) return { sent: false, reason: "not_configured" };
  try { return await sendToBot(token, chatId, buildText(payload)); }
  catch (err) { console.error("[tg-user]", err); return { sent: false, reason: "fetch_error" }; }
}

/** Timestamp hiện tại theo giờ VN (dùng chung cho các callers) */
export function vnNow() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replace(",", "");
}
