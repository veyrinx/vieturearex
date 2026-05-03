import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { sanitizePlainText } from "@/lib/server/sanitize";

const postSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  sender_name: z.string().trim().min(1).max(30),
  anonymous_id: z.string().trim().min(1).max(60),
});

type RouteContext = { params: { sessionId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from("support_messages")
    .select("id, sender_type, sender_name, content, created_at")
    .eq("session_id", params.sessionId)
    .order("created_at", { ascending: true })
    .limit(200) as { data: Array<{ id: string; sender_type: string; sender_name: string; content: string; created_at: string }> | null; error: unknown };

  if (error) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "support-msg", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const { content, sender_name } = parsed.data;

  const { error: insertErr } = await db
    .from("support_messages")
    .insert({
      session_id: params.sessionId,
      sender_type: "user",
      sender_name,
      content: sanitizePlainText(content),
    } as never);

  if (insertErr) return NextResponse.json({ error: "Không thể gửi tin nhắn." }, { status: 500 });

  // Update last_message_at on session
  await db
    .from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", params.sessionId);

  return NextResponse.json({ ok: true });
}
