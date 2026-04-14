import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { ensureUserAccount } from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email().refine((val) => val.endsWith("@arex.tech"), {
    message: "Chỉ chấp nhận email @arex.tech",
  }),
  password: z.string().min(6),
  display_name: z.string().min(1).max(50).optional(),
  role: z.enum(["admin", "manager", "support", "user"]).optional().default("user"),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "create-account", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const displayName = parsed.data.display_name?.trim() || null;
  const role = parsed.data.role;

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;
  const user = await ensureUserAccount({ id: authUser.id, email, role });

  await logAdminActivity({
    action: "ADMIN_ACCOUNT_CREATED",
    targetType: "USER",
    targetId: user.id,
    summary: `Tạo tài khoản admin trực tiếp cho ${email}`,
  });

  return NextResponse.json({ ok: true, user: { id: user.id, email } });
}
