import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendLarkNotification } from "@/lib/server/lark-notify";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

type PendingRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  team_status: string | null;
  created_at: string;
  avatar_url: string | null;
};

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data, error } = await admin
    .from("users")
    .select("id, email, display_name, role, team_status, created_at, avatar_url")
    .eq("team_status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pending: (data ?? []) as PendingRow[] });
}

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  if (parsed.data.action === "approve") {
    const { error } = await admin
      .from("users")
      .update({ team_status: "approved" } as never)
      .eq("id", parsed.data.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Lookup email + name for the welcome / password-set email
    const { data: row } = await admin
      .from("users")
      .select("email, display_name")
      .eq("id", parsed.data.userId)
      .maybeSingle() as { data: { email: string; display_name: string | null } | null };

    // Send password-recovery email so user sets their own password
    let resetSent = false;
    if (row?.email) {
      const { error: linkError } = await admin.auth.resetPasswordForEmail(row.email);
      resetSent = !linkError;
    }

    await logAdminActivity({
      action: "TEAM_APPROVED",
      targetType: "USER",
      targetId: parsed.data.userId,
      summary: `Duyệt thành viên team ${row?.email ?? parsed.data.userId}${resetSent ? " — đã gửi email đặt mật khẩu" : ""}`,
    }).catch(() => {});

    void sendLarkNotification({
      title: "✅ Đã duyệt thành viên team",
      lines: [
        { label: "Tên", value: row?.display_name || "—" },
        { label: "Email", value: row?.email || "—" },
        { label: "Email reset password", value: resetSent ? "đã gửi" : "thất bại" },
      ],
    }).catch(() => null);

    return NextResponse.json({ ok: true, resetSent });
  }

  // reject — downgrade to plain user, status=rejected
  const { error } = await admin
    .from("users")
    .update({ team_status: "rejected", role: "user" } as never)
    .eq("id", parsed.data.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminActivity({
    action: "TEAM_REJECTED",
    targetType: "USER",
    targetId: parsed.data.userId,
    summary: `Từ chối yêu cầu gia nhập team ${parsed.data.userId}`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
