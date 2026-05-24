import "server-only";
import { getSettings } from "@/lib/data/content-service";
import type { NotifyPayload } from "./telegram-notify";

export type { NotifyPayload };

const MAIN_KEY = "integrations.lark_webhook_url";
const ALERTS_KEY = "integrations.lark_alerts_webhook_url";

export type LarkChannel = "main" | "alerts";

const STATUS_ICON: Record<string, string> = {
  ok: "✅", err: "❌", warn: "⚠️", info: "ℹ️",
};

function buildContent(p: NotifyPayload): object[][] {
  const blocks: object[][] = [];

  if (p.subtitle) {
    blocks.push([{ tag: "text", text: p.subtitle, style: ["italic"] }]);
  }

  for (const sec of p.sections) {
    if (sec.heading) {
      const icon = sec.icon ? `${sec.icon} ` : "";
      blocks.push([{ tag: "text", text: `${icon}${sec.heading}`, style: ["bold", "underline"] }]);
    }
    for (const row of sec.rows) {
      const prefix = row.status ? `${STATUS_ICON[row.status]} ` : "";
      const valueStyle = row.bold ? ["bold"] : row.mono ? ["italic"] : [];
      blocks.push([
        { tag: "text", text: `${row.label}: `, style: ["bold"] },
        { tag: "text", text: `${prefix}${row.value || "—"}`, style: valueStyle },
      ]);
    }
    blocks.push([{ tag: "text", text: " " }]);
  }

  if (p.actions?.length) {
    blocks.push(
      p.actions.map((a) => ({ tag: "a", text: a.label, href: a.url })),
    );
  }

  if (p.footer) {
    blocks.push([{ tag: "text", text: "─────────────────" }]);
    blocks.push([{ tag: "text", text: p.footer, style: ["italic"] }]);
  }

  return blocks;
}

export async function sendLarkNotification(
  payload: NotifyPayload,
  channel: LarkChannel = "main",
) {
  const settings = await getSettings();
  const main = settings.find((s) => s.key === MAIN_KEY)?.value || "";
  const alerts = settings.find((s) => s.key === ALERTS_KEY)?.value || "";
  const webhookUrl = channel === "alerts" ? (alerts || main) : main;
  if (!webhookUrl) return { sent: false, reason: "no_webhook" };

  const content = buildContent(payload);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "post",
        content: {
          post: {
            zh_cn: { title: payload.title, content },
            en_us: { title: payload.title, content },
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
