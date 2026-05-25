import "server-only";
import { getSettings } from "@/lib/data/content-service";
import type { NotifyPayload } from "./telegram-notify";

const INTERNAL_KEY = "integrations.discord_internal_webhook";
const PUBLIC_KEY   = "integrations.discord_public_webhook";
const LEGACY_KEY   = "site.discord_webhook";

const COLORS = { ok: 0x22c55e, err: 0xef4444, warn: 0xf59e0b, info: 0x3b82f6, default: 0xfbbf24 };

const EMBED_DESC_LIMIT = 4000;
const EMBED_TITLE_LIMIT = 256;

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

  let description = lines.join("\n").trim();
  if (description.length > EMBED_DESC_LIMIT) {
    description = description.slice(0, EMBED_DESC_LIMIT - 3) + "...";
  }

  const title = payload.title.length > EMBED_TITLE_LIMIT
    ? payload.title.slice(0, EMBED_TITLE_LIMIT - 1) + "…"
    : payload.title;

  return {
    title,
    description,
    color,
    footer: payload.footer ? { text: payload.footer.slice(0, 2048) } : undefined,
    timestamp: new Date().toISOString(),
  };
}

async function post(url: string, payload: NotifyPayload, color?: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [buildEmbed(payload, color)] }),
  });
  // Discord returns 204 No Content on success
  if (res.status === 204 || res.ok) return { sent: true };
  let reason = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { message?: string; code?: number };
    if (body.message) reason = body.message;
  } catch { /* ignore parse error */ }
  return { sent: false, status: res.status, reason };
}

/** Gửi vào channel nội bộ — CSKH alerts, security, báo cáo ngày */
export async function sendDiscordInternalNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url =
    settings.find((s) => s.key === INTERNAL_KEY)?.value?.trim() ||
    settings.find((s) => s.key === LEGACY_KEY)?.value?.trim() ||
    "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color); }
  catch (err) { console.error("[discord-internal]", err); return { sent: false, reason: "fetch_error" }; }
}

/** Gửi vào channel public — bài mới, sự kiện, FF update */
export async function sendDiscordPublicNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url = settings.find((s) => s.key === PUBLIC_KEY)?.value?.trim() || "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color); }
  catch (err) { console.error("[discord-public]", err); return { sent: false, reason: "fetch_error" }; }
}

export { COLORS as DISCORD_COLORS };
