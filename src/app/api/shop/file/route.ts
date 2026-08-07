import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getOrderById, isShopAdminRole, partyForOrder } from "@/lib/server/shop";
import { logSensitiveAccess, NO_STORE } from "@/lib/server/shop-privacy";
import { sanitizePrivatePath, signPrivateFile, toPrivateRef } from "@/lib/server/shop-files";

/**
 * Cổng xem ảnh nhạy cảm của chợ — xem `src/lib/server/shop-files.ts`.
 *
 * Không ai tải thẳng từ Supabase được: mọi lượt xem đều đi qua đây, phải đăng
 * nhập, phải là người trong cuộc, và đều để lại dấu trong `shop_access_logs`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Ảnh này thuộc về hồ sơ / đơn nào, và người đang xem có phần trong đó không. */
async function isAllowed(ref: string, userId: string, role: string): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;

  // 1. Ảnh nằm trong hồ sơ người bán (CCCD) — chỉ chủ hồ sơ và admin.
  const { data: seller } = (await untypedFrom(db, "shop_sellers")
    .select("user_id")
    .contains("id_images", [ref])
    .maybeSingle()) as { data: { user_id: string } | null };
  if (seller) return seller.user_id === userId || isShopAdminRole(role);

  // 2. Ảnh bằng chứng của một bước đơn, hoặc ảnh kèm tranh chấp.
  for (const table of ["shop_order_events", "shop_disputes"] as const) {
    const { data } = (await untypedFrom(db, table)
      .select("order_id")
      .contains("images", [ref])
      .limit(1)
      .maybeSingle()) as { data: { order_id: string } | null };
    if (!data) continue;

    const order = await getOrderById(data.order_id);
    if (!order) return false;
    return (await partyForOrder(order, userId, role)) !== null;
  }

  // Không gắn với bản ghi nào (ảnh vừa tải lên, chưa bấm gửi) — chỉ chủ ảnh xem.
  return false;
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-file", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401, headers: NO_STORE });
  }

  const path = sanitizePrivatePath(new URL(req.url).searchParams.get("p"));
  if (!path) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ." }, { status: 400, headers: NO_STORE });
  }

  // Ảnh luôn nằm dưới thư mục mang id người tải lên, nên chủ ảnh khỏi phải tra DB.
  const owns = path.startsWith(`${auth.userId}/`);
  if (!owns && !(await isAllowed(toPrivateRef(path), auth.userId, auth.role))) {
    return NextResponse.json({ error: "Không có quyền xem ảnh này." }, { status: 403, headers: NO_STORE });
  }

  const signed = await signPrivateFile(path);
  if (!signed) {
    return NextResponse.json({ error: "Không lấy được ảnh." }, { status: 404, headers: NO_STORE });
  }

  if (!owns) {
    void logSensitiveAccess({
      actorId: auth.userId,
      actorRole: auth.role,
      kind: "private_file",
      target: path,
      ip: getClientIp(req),
    });
  }

  return NextResponse.redirect(signed, { status: 307, headers: NO_STORE });
}
