import { NextRequest } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import {
  getDisputeForOrder,
  getOrderByCode,
  getReviewForOrder,
  listOrderEvents,
  partyForOrder,
} from "@/lib/server/shop";
import {
  applyOrderAction,
  cancelOrder,
  openDispute,
  resolveDispute,
  submitReview,
} from "@/lib/server/shop-actions";
import { isShopAdminRole } from "@/lib/server/shop";
import { logSensitiveAccess, redactOrder, redactOrderEvents, revealOrderSecret, shopJson } from "@/lib/server/shop-privacy";
import { isAllowedImageRef } from "@/lib/server/shop-files";

/**
 * Xem chi tiết đơn + thực hiện một bước trong luồng trung gian.
 * Mọi bước đều đi qua đây để kiểm tra quyền, trạng thái và ảnh bằng chứng.
 */

async function loadContext(code: string) {
  const auth = await getAuthContext();
  const order = await getOrderByCode(code);
  if (!order) return { error: shopJson({ error: "Không tìm thấy đơn." }, { status: 404 }) };
  const party = await partyForOrder(order, auth.userId, auth.role);
  if (!party) return { error: shopJson({ error: "Không có quyền xem đơn này." }, { status: 403 }) };
  return { auth, order, party };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-order-detail", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { code } = await params;
  const ctx = await loadContext(code);
  if ("error" in ctx) return ctx.error;

  const [rawEvents, dispute, review] = await Promise.all([
    listOrderEvents(ctx.order.id),
    getDisputeForOrder(ctx.order.id),
    getReviewForOrder(ctx.order.id),
  ]);

  // Cắt bớt theo vai TRƯỚC khi trả về — xem src/lib/server/shop-privacy.ts.
  const viewer = { userId: ctx.auth.userId, party: ctx.party };
  const events = redactOrderEvents(rawEvents, ctx.order, viewer);

  return shopJson(
    { order: redactOrder(ctx.order, viewer), events, dispute, review, party: ctx.party }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-order-action", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const { code } = await params;
  const ctx = await loadContext(code);
  if ("error" in ctx) return ctx.error;
  const { auth, order, party } = ctx;
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";
  const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
  const images = Array.isArray(body.images)
    ? (body.images as unknown[]).filter(isAllowedImageRef).slice(0, 6)
    : [];

  // Mở thông tin bàn giao của một dòng nhật ký — mỗi lần mở đều ghi log.
  if (action === "reveal_secret") {
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const event = (await listOrderEvents(order.id)).find((e) => e.id === eventId) ?? null;
    const secret = await revealOrderSecret(event, order, { userId: auth.userId, party });
    if (!secret) {
      return shopJson(
        { error: "Không mở được thông tin này." },
        { status: 403 },
      );
    }
    await logSensitiveAccess({
      actorId: auth.userId,
      actorRole: auth.role,
      kind: "order_secret",
      target: `${order.code}/${eventId}`,
      ip: getClientIp(req),
    });
    return shopJson({ ok: true, secret });
  }

  // Huỷ đơn
  if (action === "cancel") {
    const r = await cancelOrder({ orderId: order.id, party, actorId: auth.userId, reason: message, images });
    return r.ok
      ? shopJson({ ok: true, status: r.status })
      : shopJson({ error: r.error }, { status: r.code });
  }

  // Mở tranh chấp
  if (action === "dispute") {
    const r = await openDispute({ orderId: order.id, party, actorId: auth.userId, reason: message, images });
    return r.ok
      ? shopJson({ ok: true, status: r.status })
      : shopJson({ error: r.error }, { status: r.code });
  }

  // Đánh giá người bán sau khi đơn xong
  if (action === "review") {
    const r = await submitReview({
      orderId: order.id,
      buyerId: auth.userId,
      rating: Number(body.rating),
      comment: message,
    });
    return r.ok
      ? shopJson({ ok: true })
      : shopJson({ error: r.error }, { status: r.code });
  }

  // Chốt tranh chấp — chỉ admin
  if (action === "resolve") {
    if (!isShopAdminRole(auth.role)) {
      return shopJson({ error: "Chỉ admin chốt được tranh chấp." }, { status: 403 });
    }
    const outcome = body.outcome === "pay_seller" ? "pay_seller" : "refund_buyer";
    const r = await resolveDispute({
      orderId: order.id,
      actorId: auth.userId,
      outcome,
      resolution: message,
      images,
    });
    return r.ok
      ? shopJson({ ok: true, status: r.status })
      : shopJson({ error: r.error }, { status: r.code });
  }

  // Các bước trong luồng chuẩn
  const secret =
    body.secret && typeof body.secret === "object"
      ? Object.fromEntries(
          Object.entries(body.secret as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k.slice(0, 30), String(v).slice(0, 300)]),
        )
      : null;

  const r = await applyOrderAction({
    orderId: order.id,
    actionKey: action,
    party,
    actorId: auth.userId,
    message,
    images,
    secret,
  });

  return r.ok
    ? shopJson({ ok: true, status: r.status })
    : shopJson({ error: r.error }, { status: r.code });
}
