import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import {
  checkLoginAllowed,
  recordFailedLogin,
  resetLoginAttempts,
} from "@/lib/server/login-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getUserByEmail } from "@/lib/data/content-service";

function getIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "login-check-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);

  // Verify user có trong bảng users không
  if (searchParams.get("verify") === "1") {
    const email = searchParams.get("email") ?? "";
    if (!email) return NextResponse.json({ allowed: false });
    const user = await getUserByEmail(email).catch(() => null);
    return NextResponse.json({ allowed: Boolean(user) });
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
