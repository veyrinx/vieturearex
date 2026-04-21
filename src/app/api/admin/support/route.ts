import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-support", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ sessions: [] });

  const { data, error } = await supabase
    .from("support_sessions")
    .select("id, display_name, status, last_message_at, created_at, anonymous_id, user_id")
    .order("last_message_at", { ascending: false })
    .limit(100) as { data: Array<{ id: string; display_name: string; status: string; last_message_at: string; created_at: string; anonymous_id: string | null; user_id: string | null }> | null; error: unknown };

  if (error) return NextResponse.json({ sessions: [] });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { id?: string; status?: "open" | "closed" } | null;
  if (!body?.id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  await supabase
    .from("support_sessions")
    .update({ status: body.status ?? "closed" } as never)
    .eq("id", body.id);

  return NextResponse.json({ ok: true });
}
