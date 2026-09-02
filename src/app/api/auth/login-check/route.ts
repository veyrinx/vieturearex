import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import {
  checkLoginAllowed,
  recordFailedLogin,
  resetLoginAttempts,
} from "@/lib/server/login-guard";
import { persistBlock } from "@/lib/server/ip-blocker";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getUserByEmail } from "@/lib/data/content-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Phần tử ĐẦU của x-forwarded-for là do chính khách đặt — kẻ dò mật khẩu chỉ
 * cần đổi header mỗi lượt là bộ đếm cấm không bao giờ chạm ngưỡng, tệ hơn là
 * nó ghi lệnh cấm lên IP của người khác. `getClientIp` ưu tiên header do biên
 * (Cloudflare/proxy) đặt, khách không chèn được.
 */
const getIp = getClientIp;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "login-check-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);

  // Verify user có trong bảng users — chỉ cho phép khi đã xác thực Supabase session
  if (searchParams.get("verify") === "1") {
    const supabase = createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ allowed: false });
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    // Only allow the currently authenticated user to verify their own email
    if (!sessionUser) return NextResponse.json({ allowed: false });
    const email = sessionUser.email ?? "";
    if (!email) return NextResponse.json({ allowed: false });
    const dbUser = await getUserByEmail(email).catch(() => null);
    return NextResponse.json({ allowed: Boolean(dbUser) });
  }

  const ip = getIp(request);
  const result = await checkLoginAllowed(ip);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "login-check-post", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null) as {
    success?: boolean;
    email?: string;
  } | null;

  const ip = getIp(request);
  const email = payload?.email ?? "unknown";

  if (payload?.success) {
    await resetLoginAttempts(ip);
    await logAdminActivity({
      actorEmail: email,
      action: "ADMIN_LOGIN",
      targetType: "AUTH",
      targetId: ip,
      summary: `Đăng nhập thủ công thành công với email ${email} từ IP ${ip}`,
    });
    return NextResponse.json({ status: "ok" });
  }

  const result = await recordFailedLogin(ip);

  if (result.status === "banned") {
    // Bảng login_attempts chỉ được đọc khi CHÍNH trình duyệt chịu hỏi
    // /api/auth/login-check — kẻ dò mật khẩu thì không. Đẩy luôn sang danh
    // sách chặn để middleware chặn ở cửa, không cần ai hỏi.
    await persistBlock({
      ip,
      reason: `Dò mật khẩu: 20 lần đăng nhập sai (email ${email})`,
      by: "auto:login-guard",
      durationMs: 30 * 24 * 60 * 60 * 1000,
    });

    await logAdminActivity({
      actorEmail: email,
      action: "LOGIN_BANNED",
      targetType: "AUTH",
      targetId: ip,
      summary: `IP ${ip} bị chặn 30 ngày do cố tình đăng nhập sai 20 lần với email ${email}`,
    });
  }

  return NextResponse.json(result);
}
