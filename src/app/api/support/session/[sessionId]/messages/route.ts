import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

const postSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  sender_name: z.string().trim().min(1).max(30),
  anonymous_id: z.string().trim().min(1).max(60),
});

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { sessionId } = await params;
  const supabase = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from("support_messages")
    .select("id, sender_type, sender_name, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200) as { data: Array<{ id: string; sender_type: string; sender_name: string; content: string; created_at: string }> | null; error: unknown };

  if (error) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "support-msg", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const { sessionId } = await params;
  const db = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const { content, sender_name } = parsed.data;

  const { error: insertErr } = await db
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: "user",
      sender_name,
      content: sanitizePlainText(content),
    } as never);

  if (insertErr) return NextResponse.json({ error: "Không thể gửi tin nhắn." }, { status: 500 });

  // Update last_message_at on session + count messages for context
  const [, { count }] = await Promise.all([
    db.from("support_sessions").update({ last_message_at: new Date().toISOString() } as never).eq("id", sessionId),
    db.from("support_messages").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("sender_type", "user") as unknown as Promise<{ count: number | null }>,
  ]);

  const preview = sanitizePlainText(content).slice(0, 120) + (content.length > 120 ? "…" : "");
  const isFirst = (count ?? 1) <= 1;

  void sendTelegramNotification({
    title: isFirst ? "💬 CSKH — Tin nhắn đầu tiên" : "💬 CSKH — Tin nhắn mới",
    subtitle: `${sender_name} • ${vnNow()} (ICT)`,
    sections: [{
      rows: [
        { label: "Tên", value: sender_name, bold: true },
        { label: "Nội dung", value: preview },
        { label: "Session", value: sessionId, mono: true },
      ],
    }],
    actions: [{ label: "💬 Trả lời ngay", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site"}/admin/cskh` }],
    footer: "💬 Arex CSKH",
  }).catch(() => null);

  // Trigger AI auto-reply in background (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site";
  const secret = process.env.CRON_SECRET || process.env.APP_SECRET || "";
  void fetch(`${baseUrl}/api/support/session/${sessionId}/ai-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
