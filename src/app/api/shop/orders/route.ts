import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getSellerByUser, isAgentRole, isShopAdminRole, listOrders } from "@/lib/server/shop";
import { createOrder } from "@/lib/server/shop-actions";
import { anonymizeUnclaimed, redactOrders, shopJson } from "@/lib/server/shop-privacy";
import type { OrderStatus } from "@/lib/constants/shop";

/** Đơn của tôi (mua/bán/nhận trung gian) + tạo đơn mới. */

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-orders", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "buying";
  const status = (sp.get("status") as OrderStatus | null) ?? undefined;

  if (scope === "selling") {
    const seller = await getSellerByUser(auth.userId);
    if (!seller) return shopJson({ orders: [] });
    // Người bán không nhận được SĐT / STK / kênh chat của người mua.
    const orders = await listOrders({ sellerId: seller.id, status });
    return shopJson(
      { orders: redactOrders(orders, { userId: auth.userId, party: "seller" }) }
  );
  }

  if (scope === "agent") {
    if (!isAgentRole(auth.role)) return shopJson({ error: "Không có quyền." }, { status: 403 });
    // Đơn mình đang ôm + đơn chưa ai nhận
    const [mine, open] = await Promise.all([
      listOrders({ agentId: auth.userId, status }),
      listOrders({ status: "pending_agent" }),
    ]);
    const seen = new Set(mine.map((o) => o.id));
    // Hàng chờ hiện ẩn danh: giao dịch viên chỉ thấy thông tin người mua sau
    // khi đã bấm nhận đơn và chịu trách nhiệm với nó.
    const viewer = { userId: auth.userId, party: "agent" as const };
    return shopJson(
      {
        orders: [
          ...anonymizeUnclaimed(redactOrders(open.filter((o) => !seen.has(o.id)), viewer)),
          ...mine,
        ],
      }
  );
  }

  if (scope === "all") {
    if (!isShopAdminRole(auth.role)) return shopJson({ error: "Không có quyền." }, { status: 403 });
    return shopJson({ orders: await listOrders({ status }) });
  }

  const mine = await listOrders({ buyerId: auth.userId, status });
  return shopJson(
    { orders: redactOrders(mine, { userId: auth.userId, party: "buyer" }) }
  );
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-order-create", limit: 10, windowMs: 600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const buyerName = str(body.buyerName, 60);
  const buyerPhone = str(body.buyerPhone, 20);
  const buyerContact = str(body.buyerContact, 120);
  const listingId = str(body.listingId, 40);

  if (!listingId) return shopJson({ error: "Thiếu tin đăng." }, { status: 400 });
  if (!buyerName || !buyerPhone || !buyerContact) {
    return shopJson(
      { error: "Cần họ tên, số điện thoại và kênh liên hệ để giao dịch viên làm việc." },
      { status: 400 },
    );
  }

  const result = await createOrder({
    listingId,
    buyerId: auth.userId,
    buyerName,
    buyerPhone,
    buyerContact,
    buyerBank: str(body.buyerBank, 120) || null,
  });

  if (!result.ok) return shopJson({ error: result.error }, { status: result.code });
  return shopJson({ ok: true, code: result.code }, { status: 201 });
}
