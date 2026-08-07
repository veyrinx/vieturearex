import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { sha256B64url, verifyHubGrant, type HubGrant } from "@/lib/server/hub-sso";
import type { UserRole } from "@/lib/types/content";

/**
 * Bước 4 của luồng SSO Arex Hub — xem `src/lib/server/hub-sso.ts`.
 *
 * App gửi vé nhận được qua deep link kèm `verifier` (bản gốc của challenge).
 * Khớp thì server sinh một magic link dùng-một-lần bằng service role và trả về
 * `tokenHash`; app gọi `supabase.auth.verifyOtp()` để có phiên thật của chính
 * người dùng đó. Không token dài hạn nào đi qua deep link.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support"];

/** Vai trò hiện tại đọc từ DB — vé có thể đã ký trước khi bị hạ quyền/khoá. */
async function currentRole(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  grant: HubGrant,
): Promise<{ role: UserRole; banned: boolean }> {
  const { data } = (await admin
    .from("users")
    .select("role, is_banned")
    .eq("id", grant.sub)
    .maybeSingle()) as { data: { role: UserRole | null; is_banned: boolean | null } | null };

  return {
    role: data?.role ?? (grant.role as UserRole),
    banned: Boolean(data?.is_banned),
  };
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "hub-sso-exchange",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as {
    grant?: unknown;
    verifier?: unknown;
  } | null;

  const grant = await verifyHubGrant(body?.grant);
  if (!grant) {
    return NextResponse.json(
      { error: "Vé đăng nhập không hợp lệ hoặc đã hết hạn. Hãy thử đăng nhập lại." },
      { status: 400 },
    );
  }

  const verifier = typeof body?.verifier === "string" ? body.verifier : "";
  if (!verifier || (await sha256B64url(verifier)) !== grant.ch) {
    return NextResponse.json(
      { error: "Vé đăng nhập không khớp với thiết bị này." },
      { status: 400 },
    );
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Máy chủ chưa cấu hình đăng nhập SSO." }, { status: 500 });
  }

  const { role, banned } = await currentRole(admin, grant);
  if (banned) return NextResponse.json({ error: "Tài khoản đang bị khoá." }, { status: 403 });
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Tài khoản này không có quyền vào Arex Hub." },
      { status: 403 },
    );
  }

  // generateLink KHÔNG gửi email — chỉ sinh mã OTP dùng một lần để app đổi lấy phiên.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: grant.email,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json(
      { error: error?.message ?? "Không tạo được phiên đăng nhập." },
      { status: 500 },
    );
  }

  // Nhật ký đăng nhập cho trang hồ sơ — hỏng cũng không chặn đăng nhập.
  try {
    const ip = getClientIp(request);
    await admin.from("login_logs").insert({
      user_id: grant.sub,
      email: grant.email,
      ip: ip !== "unknown" ? ip : null,
      user_agent: request.headers.get("user-agent"),
      method: "hub_sso",
    } as never);
  } catch {
    /* non-fatal */
  }

  return NextResponse.json(
    { tokenHash, email: grant.email, role },
    { headers: { "cache-control": "no-store" } },
  );
}
