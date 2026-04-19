import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";

const schema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-signout", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { error } = await adminClient.auth.admin.signOut(parsed.data.id);
  if (error) return NextResponse.json({ error: "Không thể đăng xuất tài khoản này." }, { status: 500 });

  await logAdminActivity({
    action: "USER_FORCED_SIGNOUT",
    targetType: "USER",
    targetId: parsed.data.id,
    summary: `Đăng xuất cưỡng bức tài khoản ${parsed.data.id}`,
  });

  return NextResponse.json({ ok: true });
}
