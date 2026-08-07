import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getOrderById, isAgentRole, isShopAdminRole, listDisputes } from "@/lib/server/shop";
import { NO_STORE } from "@/lib/server/shop-privacy";

/** Bàn tranh chấp của staff — xem đơn nào đang kẹt để vào xử lý. */

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-disputes", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role) && !isAgentRole(auth.role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const disputes = await listDisputes(status);

  // Gắn mã đơn để bấm thẳng sang màn xử lý
  const orders = await Promise.all(disputes.map((d) => getOrderById(d.order_id)));
  const rows = disputes.map((d, i) => ({
    ...d,
    order_code: orders[i]?.code ?? null,
    amount: orders[i]?.amount ?? 0,
    order_status: orders[i]?.status ?? null,
    listing_title: orders[i]?.listing?.title ?? null,
  }));

  return NextResponse.json({ disputes: rows }, { headers: NO_STORE });
}
