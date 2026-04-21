import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { resolveCurrentAdminEmail } from "@/lib/server/admin-activity";
import { sanitizePlainText } from "@/lib/server/sanitize";

const schema = z.object({
  session_id: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-support-reply", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const adminEmail = await resolveCurrentAdminEmail();
  const senderName = adminEmail.split("@")[0] ?? "Admin";

  const { error } = await supabase
    .from("support_messages")
    .insert({
      session_id: parsed.data.session_id,
      sender_type: "admin",
      sender_name: `[Admin] ${senderName}`,
      content: sanitizePlainText(parsed.data.content),
    } as never);

  if (error) return NextResponse.json({ error: "Không thể gửi phản hồi." }, { status: 500 });

  await supabase
    .from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", parsed.data.session_id);

  return NextResponse.json({ ok: true });
}
