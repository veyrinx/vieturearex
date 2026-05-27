import "server-only";
import { getSettings } from "@/lib/data/content-service";
import type { NotifyPayload } from "./telegram-notify";

const INTERNAL_KEY  = "integrations.discord_internal_webhook";
const PUBLIC_KEY    = "integrations.discord_public_webhook";
const LEGACY_KEY    = "site.discord_webhook";
const SITE_NAME_KEY = "branding.site_name";
const LOGO_KEY      = "branding.logo_light_url";

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

async function post(
  url: string,
  payload: NotifyPayload,
  color?: number,
  profile?: { username?: string; avatar_url?: string },
) {
  const body: Record<string, unknown> = { embeds: [buildEmbed(payload, color)] };
  if (profile?.username) body.username = profile.username.slice(0, 80);
  if (profile?.avatar_url) body.avatar_url = profile.avatar_url;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

function getProfile(settings: Awaited<ReturnType<typeof getSettings>>) {
  const username = settings.find((s) => s.key === SITE_NAME_KEY)?.value?.trim() || undefined;
  const avatar_url = settings.find((s) => s.key === LOGO_KEY)?.value?.trim() || undefined;
  return { username, avatar_url };
}

/** Gửi vào channel nội bộ — CSKH alerts, security, báo cáo ngày */
export async function sendDiscordInternalNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url =
    settings.find((s) => s.key === INTERNAL_KEY)?.value?.trim() ||
    settings.find((s) => s.key === LEGACY_KEY)?.value?.trim() ||
    "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color, getProfile(settings)); }
  catch (err) { console.error("[discord-internal]", err); return { sent: false, reason: "fetch_error" }; }
}

/** Gửi vào channel public — bài mới, sự kiện, FF update */
export async function sendDiscordPublicNotification(payload: NotifyPayload, color?: number) {
  const settings = await getSettings();
  const url = settings.find((s) => s.key === PUBLIC_KEY)?.value?.trim() || "";
  if (!url) return { sent: false, reason: "no_webhook" };
  try { return await post(url, payload, color, getProfile(settings)); }
  catch (err) { console.error("[discord-public]", err); return { sent: false, reason: "fetch_error" }; }
}

export { COLORS as DISCORD_COLORS };
