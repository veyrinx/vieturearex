import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { ensureUserAccount } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { awardAchievement } from "@/lib/server/award-achievement";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

const schema = z.object({
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự."),
  display_name: z.string().min(1).max(60).optional(),
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
  const displayName = parsed.data.display_name?.trim() || null;

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm, no email verification required
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("already") || authError.message?.toLowerCase().includes("registered")) {
      return NextResponse.json({ error: "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;
  try {
    await ensureUserAccount({ id: authUser.id, email, role: "user" });
    if (displayName) {
      await adminClient.from("users").update({ display_name: displayName } as never).eq("id", authUser.id);
    }
    void awardAchievement(authUser.id, "newcomer");
  } catch {
    // Profile creation failed — auth user exists, non-fatal
  }

  await logAdminActivity({
    action: "USER_REGISTERED",
    targetType: "USER",
    targetId: authUser.id,
    summary: `Tài khoản mới đăng ký: ${email}${displayName ? ` (${displayName})` : ""}`,
  }).catch(() => {});

  void sendTelegramNotification({
    title: "👤 THÀNH VIÊN MỚI ĐĂNG KÝ",
    subtitle: vnNow(),
    sections: [{
      rows: [
        { label: "Email", value: email },
        { label: "Tên hiển thị", value: displayName ?? "Chưa đặt" },
        { label: "ID", value: authUser.id },
      ],
    }],
    footer: "✨ Arex Register",
  }).catch(() => null);

  return NextResponse.json({ ok: true, emailVerificationRequired: true });
}
