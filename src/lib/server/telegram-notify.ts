import "server-only";
import { getSettings } from "@/lib/data/content-service";

const TOKEN_KEY = "integrations.telegram_bot_token";
const CHAT_KEY = "integrations.telegram_chat_id";

export async function sendTelegramNotification(opts: {
  title: string;
  lines: Array<{ label: string; value: string }>;
  url?: string;
}) {
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value || "";
  const chatId = settings.find((s) => s.key === CHAT_KEY)?.value || "";
  if (!token || !chatId) return { sent: false, reason: "not_configured" };

  const lines = opts.lines
    .map((l) => `<b>${l.label}:</b> ${escapeHtml(l.value || "—")}`)
    .join("\n");
  const text = `<b>${escapeHtml(opts.title)}</b>\n\n${lines}${
    opts.url ? `\n\n<a href="${opts.url}">Mở link</a>` : ""
  }`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (res.ok) return { sent: true };
    const data = (await res.json().catch(() => ({}))) as { description?: string };
    return { sent: false, status: res.status, error: data.description };
  } catch (err) {
    console.error("[telegram-notify] Failed:", err);
    return { sent: false, reason: "fetch_error" };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
