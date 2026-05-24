import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generateAiReply, isAiReplyEnabled, getAiBotName } from "@/lib/server/ai-support";
import { sanitizePlainText } from "@/lib/server/sanitize";

type RouteContext = { params: Promise<{ sessionId: string }> };

// Internal endpoint — called server-side after user sends a message.
// Not protected by admin auth since it's triggered internally via server-side fetch.
// Protected by INTERNAL_SECRET header instead.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET && secret !== process.env.APP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enabled = await isAiReplyEnabled();
  if (!enabled) return NextResponse.json({ ok: false, reason: "disabled" });

  const { sessionId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "no_db" });

  // Fetch last 12 messages for context
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

  if (!messages.length) return NextResponse.json({ ok: false, reason: "no_messages" });

  // Get site name from session's site context (fallback to env)
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Arex";

  const result = await generateAiReply(messages, siteName);
  if (!result.reply) return NextResponse.json({ ok: false, reason: result.category });

  const botName = await getAiBotName();

  // Insert AI response as admin message with special sender_name marker
  const { error } = await db
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: `[AI] ${botName}`,
      content: sanitizePlainText(result.reply),
    } as never);

  if (error) return NextResponse.json({ ok: false, reason: "insert_failed" });

  await db
    .from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", sessionId);

  return NextResponse.json({ ok: true, refused: result.refused, category: result.category });
}
