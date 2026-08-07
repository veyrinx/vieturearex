import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSellerById, isShopAdminRole } from "@/lib/server/shop";
import { NO_STORE, logSensitiveAccess } from "@/lib/server/shop-privacy";
import type { SellerStatus } from "@/lib/constants/shop";

/** Admin duyệt / từ chối / khoá hồ sơ người bán. Duyệt xong cấp luôn role `seller`. */

const ALLOWED: SellerStatus[] = ["pending", "approved", "rejected", "suspended"];

/**
 * Mở đủ một hồ sơ để duyệt: số tài khoản thật và ảnh giấy tờ.
 *
 * Tách khỏi danh sách có chủ đích — admin phải chủ động mở từng hồ sơ, và mỗi
 * lần mở là một dòng trong `shop_access_logs`. Nếu sau này có chuyện lộ CCCD
 * của người bán thì còn tra được ai đã xem, lúc nào.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-seller-reveal", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403, headers: NO_STORE });
  }

  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404, headers: NO_STORE });
  }

  await logSensitiveAccess({
    actorId: auth.userId,
    actorRole: auth.role,
    kind: "seller_documents",
    target: `${seller.id} (${seller.display_name})`,
    ip: getClientIp(req),
  });

  return NextResponse.json({ seller }, { headers: NO_STORE });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-seller-review", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller) return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { status?: string; reason?: string };
  const status = body.status as SellerStatus | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = (await untypedFrom(db, "shop_sellers")
    .update({
      status,
      reject_reason: status === "rejected" || status === "suspended" ? (body.reason ?? "").slice(0, 300) : null,
      approved_at: status === "approved" ? now : seller.approved_at,
      approved_by: status === "approved" ? auth.userId : null,
    } as never)
    .eq("id", id)) as { error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Gắn/gỡ role `seller` — không đụng vào ai đang là nhân sự của site
  const { data: profile } = (await untypedFrom(db, "users")
    .select("role")
    .eq("id", seller.user_id)
    .maybeSingle()) as { data: { role: string } | null };

  if (status === "approved" && profile?.role === "user") {
    await untypedFrom(db, "users").update({ role: "seller" } as never).eq("id", seller.user_id);
  }
  if (status !== "approved" && profile?.role === "seller") {
    await untypedFrom(db, "users").update({ role: "user" } as never).eq("id", seller.user_id);
  }

  return NextResponse.json({ ok: true, status });
}
