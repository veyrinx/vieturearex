import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsers, resetUserPassword } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ROLE_HIERARCHY: Record<string, number> = {
  it: 150, super_admin: 100, admin: 80, manager: 60, support: 40, user: 20,
};

const schema = z.object({ id: z.string().min(1) });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-reset-pw", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  // Get caller role
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: callerProfile } = await supabase.from("users").select("role").eq("id", caller.id).maybeSingle() as { data: { role: string } | null };
  const callerLevel = ROLE_HIERARCHY[callerProfile?.role ?? ""] ?? 0;

  // Check target user role
  const allUsers = await getUsers();
  const target = allUsers.find((u) => u.id === parsed.data.id);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const targetLevel = ROLE_HIERARCHY[target.role] ?? 0;
  if (targetLevel >= callerLevel) {
    return NextResponse.json({ error: "Không thể reset mật khẩu tài khoản có quyền bằng hoặc cao hơn bạn." }, { status: 403 });
  }

  const { tempPassword } = await resetUserPassword(parsed.data.id);
  await logAdminActivity({
    action: "USER_PASSWORD_RESET",
    targetType: "USER",
    targetId: target.id,
    summary: `Reset mật khẩu tài khoản ${target.email}`,
  });

  return NextResponse.json({ tempPassword });
}
