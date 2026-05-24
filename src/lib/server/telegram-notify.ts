import "server-only";
import { getSettings } from "@/lib/data/content-service";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotifyRow {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  status?: "ok" | "err" | "warn" | "info";
}

export interface NotifySection {
  icon?: string;
  heading?: string;
  rows: NotifyRow[];
}

export interface NotifyPayload {
  title: string;
  subtitle?: string;
  sections: NotifySection[];
  actions?: Array<{ label: string; url: string }>;
  footer?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOKEN_KEY = "integrations.telegram_bot_token";
const CHAT_KEY = "integrations.telegram_chat_id";

const STATUS_ICON: Record<string, string> = {
  ok: "✅", err: "❌", warn: "⚠️", info: "ℹ️",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildText(p: NotifyPayload): string {
  const lines: string[] = [];

  // Title
  lines.push(`<b>${e(p.title)}</b>`);
  if (p.subtitle) lines.push(`<i>${e(p.subtitle)}</i>`);

  // Sections
  for (const sec of p.sections) {
    lines.push("");
    if (sec.heading) {
      const icon = sec.icon ? `${sec.icon} ` : "";
      lines.push(`<b>${icon}${e(sec.heading)}</b>`);
    }
    sec.rows.forEach((row, i) => {
      const last = i === sec.rows.length - 1;
      const connector = last ? "┗" : "┣";
      const prefix = row.status ? `${STATUS_ICON[row.status]} ` : "";
      const val = row.mono
        ? `<code>${e(row.value || "—")}</code>`
        : row.bold
          ? `<b>${e(row.value || "—")}</b>`
          : e(row.value || "—");
      lines.push(`${connector} ${e(row.label)}: ${prefix}${val}`);
    });
  }

  // Action links
  if (p.actions?.length) {
    lines.push("");
    lines.push(p.actions.map((a) => `<a href="${a.url}">${e(a.label)}</a>`).join("  ·  "));
  }

  // Footer
  if (p.footer) {
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━");
    lines.push(`<i>${e(p.footer)}</i>`);
  }

  return lines.join("\n");
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function sendTelegramNotification(payload: NotifyPayload) {
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value || "";
  const chatId = settings.find((s) => s.key === CHAT_KEY)?.value || "";
  if (!token || !chatId) return { sent: false, reason: "not_configured" };

  const text = buildText(payload);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (res.ok) return { sent: true };
    const data = (await res.json().catch(() => ({}))) as { description?: string };
    return { sent: false, status: res.status, error: data.description };
  } catch (err) {
    console.error("[telegram-notify] Failed:", err);
    return { sent: false, reason: "fetch_error" };
  }
}

// ── Timestamp helper (shared by callers) ─────────────────────────────────────

export function vnNow() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replace(",", "");
}
