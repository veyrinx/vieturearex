import "server-only";
import { getSettings } from "@/lib/data/content-service";
import type { NotifyPayload } from "./telegram-notify";

const INTERNAL_KEY = "integrations.discord_internal_webhook";
const PUBLIC_KEY   = "integrations.discord_public_webhook";
const LEGACY_KEY   = "site.discord_webhook";

const COLORS = { ok: 0x22c55e, err: 0xef4444, warn: 0xf59e0b, info: 0x3b82f6, default: 0xfbbf24 };

function buildEmbed(payload: NotifyPayload, color = COLORS.default) {
  const lines: string[] = [];
  if (payload.subtitle) lines.push(`*${payload.subtitle}*`, "");

  for (const sec of payload.sections) {
    if (sec.heading) lines.push(`**${sec.icon ? `${sec.icon} ` : ""}${sec.heading}**`);
    for (const row of sec.rows) {
      const val = row.mono ? `\`${row.value || "—"}\`` : row.bold ? `**${row.value || "—"}**` : row.value || "—";
      lines.push(`**${row.label}:** ${val}`);
    }
    lines.push("");
  }

  if (payload.actions?.length) {
    lines.push(payload.actions.map((a) => `[${a.label}](${a.url})`).join("  ·  "));
  }

  return {
    title: payload.title,
    description: lines.join("\n").trim(),
    color,
    footer: payload.footer ? { text: payload.footer } : undefined,
    timestamp: new Date().toISOString(),
  };
}

async function post(url: string, payload: NotifyPayload, color?: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [buildEmbed(payload, color)] }),
  });
  if (res.status === 204 || res.ok) return { sent: true };
  return { sent: false, status: res.status };
}

/** Gửi vào channel nội bộ — CSKH alerts, security, báo cáo ngày */
export async function sendDiscordInternalNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url =
    settings.find((s) => s.key === INTERNAL_KEY)?.value ||
    settings.find((s) => s.key === LEGACY_KEY)?.value ||
    "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color); }
  catch (err) { console.error("[discord-internal]", err); return { sent: false, reason: "fetch_error" }; }
}

/** Gửi vào channel public — bài mới, sự kiện, FF update */
export async function sendDiscordPublicNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url = settings.find((s) => s.key === PUBLIC_KEY)?.value || "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color); }
  catch (err) { console.error("[discord-public]", err); return { sent: false, reason: "fetch_error" }; }
}

export { COLORS as DISCORD_COLORS };
