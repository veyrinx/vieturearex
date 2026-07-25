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
  /** Ảnh kèm — nếu có sẽ gửi bằng sendPhoto (caption HTML). URL công khai (https). */
  imageUrl?: string;
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

  // Các nút (actions) render bằng inline keyboard bên dưới — không nhét vào text nữa.

  if (p.footer) {
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━");
    lines.push(`<i>${e(p.footer)}</i>`);
  }

  return lines.join("\n");
}

/** Chỉ giữ URL https hợp lệ để dùng cho sendPhoto / nút url. */
function safeHttpUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? url : null;
  } catch { return null; }
}

function buildKeyboard(p: NotifyPayload) {
  const buttons = (p.actions ?? [])
    .map((a) => ({ text: a.label, url: safeHttpUrl(a.url) }))
    .filter((b): b is { text: string; url: string } => Boolean(b.url));
  if (!buttons.length) return undefined;
  // Tối đa 2 nút / hàng cho gọn.
  const rows: Array<Array<{ text: string; url: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return { inline_keyboard: rows };
}

// Caption của sendPhoto giới hạn 1024 ký tự; sendMessage giới hạn 4096.
const TG_CAPTION_MAX = 1024;

async function sendToBot(token: string, chatId: string, payload: NotifyPayload) {
  const text = buildText(payload);
  const reply_markup = buildKeyboard(payload);
  const photo = safeHttpUrl(payload.imageUrl);

  // Có ảnh + caption vừa đủ → gửi kèm ảnh; nếu lỗi thì tự rớt về text.
  if (photo && text.length <= TG_CAPTION_MAX) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo, caption: text, parse_mode: "HTML", reply_markup }),
    });
    if (res.ok) return { sent: true };
    // Ảnh hỏng / hotlink chặn → fallback text bên dưới.
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      // Cho phép preview khi có ảnh nhưng caption quá dài (Telegram tự lấy ảnh đầu link).
      disable_web_page_preview: !photo,
      reply_markup,
    }),
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
  try { return await sendToBot(token, chatId, payload); }
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
  try { return await sendToBot(token, chatId, payload); }
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
