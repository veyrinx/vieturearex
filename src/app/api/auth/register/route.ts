import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants/admin-domain";
import {
  ensureUserAccount,
  consumeInvitedEmail,
  getInvitedEmails,
  isEmailInvited,
} from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appendUserToLarkSheet } from "@/lib/server/lark-sheet";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";

const schema = z.object({
  email: z.string().email().refine((val) => val.endsWith(`@${ADMIN_EMAIL_DOMAIN}`), {
    message: `Chỉ chấp nhận email @${ADMIN_EMAIL_DOMAIN}`,
  }),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "auth-register", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  // Kiểm tra email có trong danh sách mời không
  const invitedEmails = await getInvitedEmails();
  if (!isEmailInvited(email, invitedEmails)) {
    return NextResponse.json({ error: "EMAIL NÀY CHƯA ĐƯỢC QUẢN TRỊ VIÊN CHO PHÉP TẠO TÀI KHOẢN." }, { status: 403 });
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  // Tạo user qua admin API - không cần confirm email
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Bỏ qua bước xác nhận email
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;

  // Tạo record trong bảng users
  const user = await ensureUserAccount({ id: authUser.id, email, role: "user" });

  // Xóa khỏi danh sách mời
  await consumeInvitedEmail(email);

  await logAdminActivity({
    actorEmail: email,
    action: "ADMIN_ACCOUNT_CREATED",
    targetType: "USER",
    targetId: user.id,
    summary: `Tạo tài khoản admin qua thư mời cho ${email}`,
  });

  // Fire-and-forget: sync new user to Lark spreadsheet
  void appendUserToLarkSheet({ email, display_name: user.display_name, role: user.role });

  // Notify admin channels
  void Promise.allSettled([
    sendTelegramNotification({
      title: "👤 Tài khoản admin mới được tạo",
      subtitle: vnNow(),
      sections: [{ icon: "✅", heading: "Thông tin tài khoản", rows: [
        { label: "Email", value: email, mono: true },
        { label: "Tên", value: user.display_name || "Chưa đặt" },
        { label: "Vai trò", value: user.role },
      ]}],
      footer: "🤖 Arex Admin",
    }),
    sendDiscordInternalNotification({
      title: "👤 Tài khoản admin mới được tạo",
      subtitle: vnNow(),
      sections: [{ icon: "✅", heading: "Thông tin tài khoản", rows: [
        { label: "Email", value: email, mono: true },
        { label: "Tên", value: user.display_name || "Chưa đặt" },
        { label: "Vai trò", value: user.role },
      ]}],
      footer: "🤖 Arex Admin",
    }, DISCORD_COLORS.info),
    sendLarkNotification({
      title: "👤 Tài khoản admin mới được tạo",
      subtitle: vnNow(),
      sections: [{ icon: "✅", heading: "Thông tin tài khoản", rows: [
        { label: "Email", value: email, mono: true },
        { label: "Tên", value: user.display_name || "Chưa đặt" },
        { label: "Vai trò", value: user.role },
      ]}],
      footer: "🤖 Arex Admin",
    }),
  ]);

  return NextResponse.json({ ok: true });
}
