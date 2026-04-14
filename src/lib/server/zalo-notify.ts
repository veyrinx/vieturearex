import "server-only";
import { getSettings } from "@/lib/data/content-service";

export async function sendZaloNotification(title: string, body: string, url?: string) {
  const settings = await getSettings();
  const webhookUrl = settings.find((s) => s.key === "zalo.webhook_url")?.value;

  if (!webhookUrl) return { sent: false, reason: "no_webhook" };

  try {
    const message = `🔔 ${title}\n\n${body}${url ? `\n\n👉 ${url}` : ""}`;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message, content: message }),
    });

    return { sent: res.ok, status: res.status };
  } catch (err) {
    console.error("[zalo-notify] Failed:", err);
    return { sent: false, reason: "fetch_error" };
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

  if (hoursLeft <= 0) return { sent: false, reason: "already_started" };

  return sendZaloNotification(
    `⏰ SẮP DIỄN RA: ${title}`,
    `Còn ${hoursLeft} giờ nữa sẽ bắt đầu!`,
  );
}
