import "server-only";
import { getSettings } from "@/lib/data/content-service";

const ZALO_OA_MESSAGE_API = "https://openapi.zalo.me/v3.0/oa/message";

/**
 * Send a Zalo notification.
 *
 * Prefers the official Zalo Official Account API (access token + recipient
 * user_id) over the legacy generic webhook. Falls back to the webhook when the
 * OA API isn't configured, so existing setups keep working.
 */
export async function sendZaloNotification(title: string, body: string, url?: string) {
  const settings = await getSettings();
  const get = (key: string) => settings.find((s) => s.key === key)?.value?.trim() || "";

  const message = `🔔 ${title}\n\n${body}${url ? `\n\n👉 ${url}` : ""}`;

  // ── Official OA API (preferred) ──
  const accessToken = get("zalo.oa_access_token") || (process.env.ZALO_OA_ACCESS_TOKEN ?? "");
  const recipientId = get("zalo.recipient_user_id") || get("zalo.group_id");

  if (accessToken && recipientId) {
    try {
      const res = await fetch(ZALO_OA_MESSAGE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: accessToken },
        body: JSON.stringify({
          recipient: { user_id: recipientId },
          message: { text: message },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
      // Zalo returns { error: 0 } on success; non-zero error means failure.
      if (res.ok && (data.error === undefined || data.error === 0)) {
        return { sent: true, via: "oa_api" as const };
      }
      // Fall through to webhook on API error
      console.warn("[zalo-notify] OA API error:", data.error, data.message);
    } catch (err) {
      console.error("[zalo-notify] OA API failed:", err);
    }
  }

  // ── Legacy webhook (fallback) ──
  const webhookUrl = get("zalo.webhook_url");
  if (!webhookUrl) return { sent: false, reason: "not_configured" as const };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message, content: message }),
    });
    return { sent: res.ok, via: "webhook" as const, status: res.status };
  } catch (err) {
    console.error("[zalo-notify] Webhook failed:", err);
    return { sent: false, reason: "fetch_error" as const };
  }
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
