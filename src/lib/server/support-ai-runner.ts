import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generateAiReply, isAiReplyEnabled, getAiBotName } from "@/lib/server/ai-support";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

/**
 * Generate + persist an AI support reply for a session. Runs in-process so the
 * message POST can trigger it directly (no self-fetch, no internal secret) —
 * that HTTP round-trip was silently 403ing whenever CRON_SECRET/APP_SECRET
 * weren't set, so the AI never replied.
 */
export async function processAiReplyForSession(
  sessionId: string,
): Promise<{ ok: boolean; reason?: string; category?: string; refused?: boolean }> {
  const enabled = await isAiReplyEnabled();
  if (!enabled) return { ok: false, reason: "disabled" };

  const db = createAdminSupabaseClient();
  if (!db) return { ok: false, reason: "no_db" };

  const { data: rawMessages } = await db
    .from("support_messages")
    .select("sender_type, sender_name, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(12) as unknown as {
      data: Array<{ sender_type: string; sender_name: string; content: string; created_at: string }> | null
    };

  const messages = (rawMessages ?? []).map((m) => ({
    sender_type: m.sender_type as "user" | "admin",
    sender_name: m.sender_name,
    content: m.content,
  }));

  if (!messages.length) return { ok: false, reason: "no_messages" };

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Arex";
  const botName = await getAiBotName();
  const result = await generateAiReply(messages, siteName);

  if (!result.reply) {
    // Always leave a friendly reply instead of silence — covers empty API key,
    // refusals, provider errors, etc. (Only truly skip when disabled / no DB,
    // which are handled earlier.)
    const fallbackCategories = ["refused", "error", "no_user_message", "unknown", "no_api_key"];
    if (fallbackCategories.includes(result.category)) {
      await db.from("support_messages").insert({
        session_id: sessionId,
        sender_type: "admin",
        sender_name: `[AI] ${botName}`,
        content: "Cảm ơn bạn đã liên hệ! Câu hỏi của bạn đã được ghi nhận. Hỗ trợ viên sẽ phản hồi trong thời gian sớm nhất có thể 🙏",
      } as never);
      await db.from("support_sessions")
        .update({ last_message_at: new Date().toISOString() } as never)
        .eq("id", sessionId);

      if (result.category === "error") {
        void sendTelegramNotification({
          title: "⚠️ AI SUPPORT LỖI",
          subtitle: vnNow(),
          sections: [{ rows: [
            { label: "Session", value: sessionId, mono: true },
            { label: "Lý do", value: result.category, status: "warn" },
          ]}],
          footer: "🎧 Arex Support",
        }).catch(() => null);
      }
    }
    return { ok: false, reason: result.category };
  }

  const { error } = await db
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: `[AI] ${botName}`,
      content: sanitizePlainText(result.reply),
    } as never);

  if (error) {
    void sendTelegramNotification({
      title: "❌ AI SUPPORT — LỖI LƯU TIN NHẮN",
      subtitle: vnNow(),
      sections: [{ rows: [
        { label: "Session", value: sessionId, mono: true },
        { label: "Chi tiết", value: error.message.slice(0, 300), status: "err" },
      ]}],
      footer: "⚠️ Arex Support",
    }).catch(() => null);
    return { ok: false, reason: "insert_failed" };
  }

  await db.from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", sessionId);

  return { ok: true, refused: result.refused, category: result.category };
}
