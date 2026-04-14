import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { ensureUserAccount } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(50),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-register", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const displayName = parsed.data.display_name.trim();

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
    if (authError.message?.includes("already been registered")) {
      return NextResponse.json({ error: "EMAIL NÀY ĐÃ ĐƯỢC ĐĂNG KÝ." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;
  await ensureUserAccount({ id: authUser.id, email, role: "user" });

  return NextResponse.json({ ok: true });
}
