import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { getZaloBotToken, sendZaloBotMessage } from "@/lib/server/zalo-bot";

const ZALO_OA_MESSAGE_API = "https://openapi.zalo.me/v3.0/oa/message";

/**
 * Send a Zalo notification.
 *
 * PRIMARY: personal Zalo via a self-hosted relay webhook (`zalo.webhook_url`).
 * Personal Zalo accounts/groups have no official API, so a bot the user runs
 * (which posts into their personal group) is the only way to reach them.
 *
 * FALLBACK: official OA API (`zalo.oa_access_token` + recipient) — only used
 * when no personal webhook is configured. Kept for business Official Accounts.
 */
export async function sendZaloNotification(title: string, body: string, url?: string) {
  const settings = await getSettings();
  const get = (key: string) => settings.find((s) => s.key === key)?.value?.trim() || "";

  const message = `🔔 ${title}\n\n${body}${url ? `\n\n👉 ${url}` : ""}`;

  // ── Personal Zalo relay webhook (preferred) ──
  const webhookUrl = get("zalo.webhook_url");
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, content: message }),
      });
      if (res.ok) return { sent: true, via: "personal_webhook" as const, status: res.status };
      console.warn("[zalo-notify] Personal webhook returned", res.status);
    } catch (err) {
      console.error("[zalo-notify] Personal webhook failed:", err);
    }
  }

  // ── Bot Zalo (bot.zapps.vn) — kênh chính thức, dùng khi có token + chat id ──
  const botChatId = get("integrations.zalo_bot_chat_id") || (process.env.ZALO_BOT_CHAT_ID?.trim() ?? "");
  if (botChatId) {
    const botToken = await getZaloBotToken();
    if (botToken && (await sendZaloBotMessage(botToken, botChatId, message))) {
      return { sent: true, via: "bot" as const };
    }
  }

  // ── OA API (fallback, business Official Account only) ──
  const accessToken = get("zalo.oa_access_token") || (process.env.ZALO_OA_ACCESS_TOKEN ?? "");
  const recipientId = get("zalo.recipient_user_id") || get("zalo.group_id");
  if (accessToken && recipientId) {
    try {
      const res = await fetch(ZALO_OA_MESSAGE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: accessToken },
        body: JSON.stringify({ recipient: { user_id: recipientId }, message: { text: message } }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
      if (res.ok && (data.error === undefined || data.error === 0)) {
        return { sent: true, via: "oa_api" as const };
      }
      console.warn("[zalo-notify] OA API error:", data.error, data.message);
    } catch (err) {
      console.error("[zalo-notify] OA API failed:", err);
    }
  }

  return { sent: false, reason: "not_configured" as const };
}

export async function notifyNewEvent(title: string, startDate: string, url?: string) {
  const formattedDate = new Date(startDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendZaloNotification(
    `SỰ KIỆN MỚI: ${title}`,
    `Bắt đầu: ${formattedDate}`,
    url,
  );
}

export async function notifyUpcomingEvent(title: string, startDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const hoursLeft = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (hoursLeft <= 0) return { sent: false, reason: "already_started" as const };

  return sendZaloNotification(
    `⏰ SẮP DIỄN RA: ${title}`,
    `Còn ${hoursLeft} giờ nữa sẽ bắt đầu!`,
  );
}
