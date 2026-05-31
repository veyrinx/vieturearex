import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSettings, getNews, getEvents } from "@/lib/data/content-service";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { siteConfig } from "@/lib/constants/site";
import { subscribeUser } from "@/lib/server/telegram-broadcast";
import { enforceRateLimit } from "@/lib/server/api-guard";

const TOKEN_KEY = "integrations.telegram_bot_token";
const CHAT_KEY  = "integrations.telegram_chat_id";

const MINI_APP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/tg`
  : `${siteConfig.url}/tg`;

// Extracts a UUID session ID from Supabase Realtime notification text
// Notifications embed: "┗ Session: <uuid>" in HTML or plain text
function extractSessionId(text: string): string | null {
  const match = text.match(/Session[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

type TelegramFrom = { id: number; first_name?: string; last_name?: string; username?: string };
type TelegramMessage = {
  from?: TelegramFrom;
  chat?: { id: number };
  text?: string;
  reply_to_message?: { text?: string; caption?: string };
};
type TelegramUpdate = { message?: TelegramMessage };

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => null);
}

async function sendTelegramMessageWithKeyboard(
  token: string,
  chatId: number,
  text: string,
  replyMarkup: object,
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  }).catch(() => null);
}

function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function handleBotCommand(
  token: string,
  chatId: number,
  cmd: string,
  firstName: string,
): Promise<boolean> {
  const base = cmd.split("@")[0].toLowerCase();

  if (base === "/start" || base === "/app") {
    await sendTelegramMessageWithKeyboard(
      token,
      chatId,
      `👋 Xin chào <b>${e(firstName)}</b>!\n\nChào mừng bạn đến với <b>Arex</b> – cổng thông tin cộng đồng Free Fire hàng đầu.\n\n📰 Tin tức mới nhất\n📅 Sự kiện in-game\n🏆 Giải đấu & bracket\n\nNhấn nút bên dưới để mở Mini App:`,
      {
        inline_keyboard: [
          [{ text: "🎮 Mở Arex Mini App", web_app: { url: MINI_APP_URL } }],
          [{ text: "🌐 Mở trang web", url: siteConfig.url }],
        ],
      },
    );
    return true;
  }

  if (base === "/news") {
    const news = await getNews("published");
    const latest = news.slice(0, 5);
    if (!latest.length) {
      await sendTelegramMessage(token, chatId, "Chưa có tin tức nào.");
      return true;
    }
    const lines = ["📰 <b>Tin tức mới nhất</b>\n"];
    latest.forEach((item, i) => {
      lines.push(`${i + 1}. <a href="${siteConfig.url}/tin-tuc/${item.slug}">${e(item.title)}</a>`);
    });
    lines.push(`\n<a href="${siteConfig.url}/tin-tuc">→ Xem tất cả</a>`);
    await sendTelegramMessage(token, chatId, lines.join("\n"));
    return true;
  }

  if (base === "/events") {
    const events = await getEvents();
    const active = events.filter((ev) => ev.status === "active" || ev.status === "upcoming").slice(0, 5);
    if (!active.length) {
      await sendTelegramMessage(token, chatId, "Hiện không có sự kiện nào đang diễn ra.");
      return true;
    }
    const lines = ["📅 <b>Sự kiện Free Fire</b>\n"];
    active.forEach((ev, i) => {
      const badge = ev.status === "active" ? "🟢" : "🔵";
      lines.push(`${i + 1}. ${badge} <a href="${siteConfig.url}/su-kien/${ev.id}">${e(ev.title)}</a>`);
    });
    lines.push(`\n<a href="${siteConfig.url}/su-kien">→ Xem tất cả</a>`);
    await sendTelegramMessage(token, chatId, lines.join("\n"));
    return true;
  }

  if (base === "/help") {
    await sendTelegramMessage(
      token,
      chatId,
      `🤖 <b>Arex Bot – Danh sách lệnh</b>\n\n/start – Mở Mini App\n/news – Tin tức mới nhất\n/events – Sự kiện đang diễn ra\n/help – Danh sách lệnh\n\n<a href="${MINI_APP_URL}">🎮 Mở Mini App</a>  ·  <a href="${siteConfig.url}">🌐 Trang web</a>`,
    );
    return true;
  }

  return false;
}

// Verify webhook with Telegram challenge (unused but safe to have)
export async function GET() {
  return NextResponse.json({ ok: true });
}

// Receive Telegram updates
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-webhook", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  // Validate the shared secret Telegram sends via header
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
  if (webhookSecret) {
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (receivedSecret !== webhookSecret) {
      // Always return 200 to prevent Telegram from retrying — just silently ignore
      return NextResponse.json({ ok: true });
    }
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update?.message) return NextResponse.json({ ok: true });

  const { message } = update;
  const text = message.text?.trim();
  const chatId = message.chat?.id;
  const replyTo = message.reply_to_message;
  const fromName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean).join(" ") || "Admin";

  if (!text || !chatId) return NextResponse.json({ ok: true });

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  const adminChatId = settings.find((s) => s.key === CHAT_KEY)?.value ?? "";

  // Handle bot commands (/start, /news, /events, /help)
  if (text.startsWith("/") && !replyTo) {
    if (token) {
      const firstName = message.from?.first_name ?? fromName;
      // Auto-subscribe on /start so bot can DM this user later
      const base = text.split("@")[0].toLowerCase();
      if ((base === "/start" || base === "/app") && message.from?.id) {
        void subscribeUser(message.from.id, firstName, message.from.username).catch(() => null);
      }
      const handled = await handleBotCommand(token, chatId, text, firstName);
      if (handled) return NextResponse.json({ ok: true });
    }
  }

  // Only handle when admin replies to a CSKH notification message
  const replyText = replyTo?.text ?? replyTo?.caption ?? "";
  if (!replyText) return NextResponse.json({ ok: true });

  // Must be a CSKH notification (contains "CSKH" or "Session:")
  const isCskhNotification = /CSKH|Session:/i.test(replyText);
  if (!isCskhNotification) return NextResponse.json({ ok: true });

  const sessionId = extractSessionId(replyText);
  if (!sessionId) return NextResponse.json({ ok: true });

  const db = createAdminSupabaseClient();

  // Restrict to the configured admin chat (security: only configured chat can reply)
  if (adminChatId && String(chatId) !== adminChatId) {
    return NextResponse.json({ ok: true });
  }

  if (!db) {
    if (token) await sendTelegramMessage(token, chatId, "❌ Database không khả dụng.");
    return NextResponse.json({ ok: true });
  }

  // Verify session exists and is still open
  const { data: session } = await db
    .from("support_sessions")
    .select("id, status, display_name")
    .eq("id", sessionId)
    .maybeSingle() as { data: { id: string; status: string; display_name: string } | null };

  if (!session) {
    if (token) await sendTelegramMessage(token, chatId, `❌ Không tìm thấy phiên <code>${sessionId}</code>.`);
    return NextResponse.json({ ok: true });
  }

  if (session.status !== "open") {
    if (token) await sendTelegramMessage(token, chatId, `⚠️ Phiên của <b>${session.display_name}</b> đã đóng.`);
    return NextResponse.json({ ok: true });
  }

  // Insert admin reply
  const { error } = await db
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: fromName,
      content: sanitizePlainText(text),
    } as never);

  if (error) {
    if (token) await sendTelegramMessage(token, chatId, "❌ Không thể gửi tin nhắn. Thử lại sau.");
    return NextResponse.json({ ok: true });
  }

  await db
    .from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", sessionId);

  if (token) {
    await sendTelegramMessage(
      token,
      chatId,
      `✅ Đã gửi trả lời tới <b>${session.display_name}</b>.\n\n💬 <i>${sanitizePlainText(text).slice(0, 200)}</i>`,
    );
  }

  return NextResponse.json({ ok: true });
}
