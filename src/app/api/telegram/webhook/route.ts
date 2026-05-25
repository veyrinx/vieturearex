import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/content-service";
import { sanitizePlainText } from "@/lib/server/sanitize";

const TOKEN_KEY = "integrations.telegram_bot_token";
const CHAT_KEY  = "integrations.telegram_chat_id";

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

// Verify webhook with Telegram challenge (unused but safe to have)
export async function GET() {
  return NextResponse.json({ ok: true });
}

// Receive Telegram updates
export async function POST(req: NextRequest) {
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

  // Only handle when admin replies to a CSKH notification message
  const replyText = replyTo?.text ?? replyTo?.caption ?? "";
  if (!replyText) return NextResponse.json({ ok: true });

  // Must be a CSKH notification (contains "CSKH" or "Session:")
  const isCskhNotification = /CSKH|Session:/i.test(replyText);
  if (!isCskhNotification) return NextResponse.json({ ok: true });

  const sessionId = extractSessionId(replyText);
  if (!sessionId) return NextResponse.json({ ok: true });

  const db = createAdminSupabaseClient();
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  const adminChatId = settings.find((s) => s.key === CHAT_KEY)?.value ?? "";

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
