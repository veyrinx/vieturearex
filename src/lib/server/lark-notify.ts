import "server-only";
import { getSettings } from "@/lib/data/content-service";

const MAIN_KEY = "integrations.lark_webhook_url";
const ALERTS_KEY = "integrations.lark_alerts_webhook_url";

export type LarkChannel = "main" | "alerts";

/**
 * Send a Lark/Feishu group webhook notification.
 * - channel="main"   → integrations.lark_webhook_url (default)
 * - channel="alerts" → integrations.lark_alerts_webhook_url, falls back to main
 *
 * Lark "Custom Bot" webhook accepts simple text or richer post format.
 * We send post-format with a title + bullet content for nice rendering.
 */
export async function sendLarkNotification(opts: {
  title: string;
  lines: Array<{ label: string; value: string }>;
  url?: string;
  channel?: LarkChannel;
}) {
  const settings = await getSettings();
  const main = settings.find((s) => s.key === MAIN_KEY)?.value || "";
  const alerts = settings.find((s) => s.key === ALERTS_KEY)?.value || "";
  const channel: LarkChannel = opts.channel ?? "main";
  const webhookUrl = channel === "alerts" ? (alerts || main) : main;
  if (!webhookUrl) return { sent: false, reason: "no_webhook" };

  // Lark "post" message format
  const content = [
    ...opts.lines.map((l) => [
      { tag: "text", text: `${l.label}: `, style: ["bold"] },
      { tag: "text", text: l.value || "—" },
    ]),
    ...(opts.url
      ? [[{ tag: "a", text: "Mở link", href: opts.url }]]
      : []),
  ];

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "post",
        content: {
          post: {
            zh_cn: { title: opts.title, content },
            en_us: { title: opts.title, content },
          },
        },
      }),
    });
    if (res.ok) return { sent: true, status: res.status };
    return { sent: false, status: res.status };
  } catch (err) {
    console.error("[lark-notify] Failed:", err);
    return { sent: false, reason: "fetch_error" };
  }
}
