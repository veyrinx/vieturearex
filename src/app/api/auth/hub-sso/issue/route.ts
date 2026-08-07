import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { hubDeepLink, isValidChallenge, signHubGrant } from "@/lib/server/hub-sso";

/**
 * Bước 2 của luồng SSO Arex Hub — xem `src/lib/server/hub-sso.ts`.
 *
 * Trang `/auth/hub` (chạy trong trình duyệt hệ thống, có cookie phiên) gọi vào
 * đây kèm `challenge` app sinh ra; trả về deep link mang vé đã ký.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = ["super_admin", "admin", "it", "manager", "support"];

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "hub-sso-issue", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { challenge?: unknown } | null;
  if (!isValidChallenge(body?.challenge)) {
    return NextResponse.json({ error: "Thiếu mã xác thực từ app." }, { status: 400 });
  }

  const auth = await getAuthContext();
  if (!auth.userId || !auth.email) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  if (!ADMIN_ROLES.includes(auth.role)) {
    return NextResponse.json(
      {
        error: "Tài khoản này không có quyền vào Arex Hub.",
        role: auth.role,
      },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await signHubGrant({
    sub: auth.userId,
    email: auth.email,
    role: auth.role,
    ch: body!.challenge as string,
  });

  return NextResponse.json(
    { deepLink: hubDeepLink(token), email: auth.email, role: auth.role, expiresAt },
    { headers: { "cache-control": "no-store" } },
  );
}
