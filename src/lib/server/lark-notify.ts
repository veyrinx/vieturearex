import "server-only";
import { getSettings } from "@/lib/data/content-service";

const SETTING_KEY = "integrations.lark_webhook_url";

/**
 * Send a Lark/Feishu group webhook notification.
 * Webhook URL stored at setting key `integrations.lark_webhook_url`.
 *
 * Lark "Custom Bot" webhook accepts simple text or richer post format.
 * We send post-format with a title + bullet content for nice rendering.
 */
export async function sendLarkNotification(opts: {
  title: string;
  lines: Array<{ label: string; value: string }>;
  url?: string;
}) {
  const settings = await getSettings();
  const webhookUrl = settings.find((s) => s.key === SETTING_KEY)?.value;
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
