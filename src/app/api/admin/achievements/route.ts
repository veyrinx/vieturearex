import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { ACHIEVEMENTS_BY_ID } from "@/lib/constants/achievements";

// GET — list all user achievements (with user info)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-achievements-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const url = req.nextUrl;
  const userId = url.searchParams.get("user_id");

  let q = untypedFrom(db, "user_achievements")
    .select("id, user_id, achievement, earned_at, users!inner(display_name, email, avatar_url)")
    .order("earned_at", { ascending: false })
    .limit(300);

  if (userId) q = q.eq("user_id", userId) as typeof q;

  const { data, error } = await q as {
    data: Array<{ id: string; user_id: string; achievement: string; earned_at: string; users: { display_name: string | null; email: string; avatar_url: string | null } }> | null;
    error: unknown;
  };

  if (error) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: data ?? [] });
}

// POST — grant achievement to user
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-achievements-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const body = await req.json().catch(() => null) as { user_id?: string; achievement?: string } | null;
  if (!body?.user_id || !body?.achievement) {
    return NextResponse.json({ error: "Thiếu user_id hoặc achievement." }, { status: 400 });
  }
  if (!ACHIEVEMENTS_BY_ID[body.achievement]) {
    return NextResponse.json({ error: "Achievement không tồn tại." }, { status: 400 });
  }

  const { awardAchievement } = await import("@/lib/server/award-achievement");
  const awarded = await awardAchievement(body.user_id, body.achievement);

  await logAdminActivity({
    action: "ACHIEVEMENT_GRANTED",
    targetType: "USER",
    targetId: body.user_id,
    summary: `Cấp thành tựu "${body.achievement}" cho user ${body.user_id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, awarded });
}

// DELETE — revoke achievement from user
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-achievements-delete", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const body = await req.json().catch(() => null) as { user_id?: string; achievement?: string } | null;
  if (!body?.user_id || !body?.achievement) {
    return NextResponse.json({ error: "Thiếu user_id hoặc achievement." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { error } = await untypedFrom(db, "user_achievements")
    .delete()
    .eq("user_id", body.user_id)
    .eq("achievement", body.achievement);

  if (error) return NextResponse.json({ error: "Không thể thu hồi." }, { status: 500 });

  await logAdminActivity({
    action: "ACHIEVEMENT_REVOKED",
    targetType: "USER",
    targetId: body.user_id,
    summary: `Thu hồi thành tựu "${body.achievement}" từ user ${body.user_id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
