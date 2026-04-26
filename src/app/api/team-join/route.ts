import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureUserAccount } from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";

const schema = z.object({
  token: z.string().min(8).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(80).optional(),
});

type InviteRow = {
  id: string;
  token: string;
  used_at: string | null;
  expires_at: string;
};

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "team-join", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  // Verify token
  const { data: invite } = await admin
    .from("team_invites")
    .select("id, token, used_at, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle() as { data: InviteRow | null };

  if (!invite) return NextResponse.json({ error: "Mã mời không tồn tại." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "Mã mời đã được sử dụng." }, { status: 410 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Mã mời đã hết hạn." }, { status: 410 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const displayName = parsed.data.display_name?.trim() || null;

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authError) {
    const msg = authError.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "Email này đã được đăng ký." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;
  await ensureUserAccount({ id: authUser.id, email, role: "team_member" });

  // Set pending status + display name
  await admin
    .from("users")
    .update({
      role: "team_member",
      team_status: "pending",
      ...(displayName ? { display_name: displayName } : {}),
    } as never)
    .eq("id", authUser.id);

  // Mark invite consumed
  await admin
    .from("team_invites")
    .update({ used_by: authUser.id, used_at: new Date().toISOString() } as never)
    .eq("id", invite.id);

  await logAdminActivity({
    actorEmail: email,
    action: "TEAM_JOIN_REQUEST",
    targetType: "USER",
    targetId: authUser.id,
    summary: `Yêu cầu gia nhập team từ ${email}${displayName ? ` (${displayName})` : ""} — chờ IT duyệt`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: "pending" });
}
