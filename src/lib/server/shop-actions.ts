import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  CANCELLABLE_STATUSES,
  DISPUTABLE_STATUSES,
  ORDER_FLOW,
  calcFee,
  calcPayout,
  type OrderEventType,
  type OrderParty,
  type OrderStatus,
} from "@/lib/constants/shop";
import {
  generateOrderCode,
  getListing,
  getOrderById,
  getSellerById,
} from "@/lib/server/shop";
import { encryptSecret } from "@/lib/server/shop-crypto";
import { isAllowedImageRef } from "@/lib/server/shop-files";
import type { ShopOrder, ShopSeller } from "@/lib/types/shop";

/**
 * Máy trạng thái của đơn hàng có trung gian giữ tiền.
 *
 * Nguyên tắc: mỗi lần đổi trạng thái đều ghi một dòng vào `shop_order_events`
 * kèm ảnh chụp bắt buộc. Không có đường tắt — muốn nhảy bước phải là admin
 * xử lý tranh chấp.
 */

export type ActionResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; error: string; code: number };

function db() {
  return createAdminSupabaseClient();
}

async function logEvent(input: {
  orderId: string;
  actorId: string | null;
  actorRole: OrderParty;
  type: OrderEventType;
  message?: string;
  images?: string[];
  secret?: Record<string, string> | null;
}) {
  const client = db();
  if (!client) return;
  await untypedFrom(client, "shop_order_events").insert({
    order_id: input.orderId,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    type: input.type,
    message: input.message ?? "",
    images: input.images ?? [],
    // Tài khoản/mật khẩu bàn giao không bao giờ nằm dạng đọc được trong DB.
    secret: await encryptSecret(input.secret),
  } as never);
}

// ── Tạo đơn ────────────────────────────────────────────────────────────────
export async function createOrder(input: {
  listingId: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerContact: string;
  buyerBank?: string | null;
}): Promise<{ ok: true; code: string } | { ok: false; error: string; code: number }> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const listing = await getListing(input.listingId);
  if (!listing) return { ok: false, error: "Không tìm thấy tin đăng.", code: 404 };
  if (listing.status !== "active") {
    return { ok: false, error: "Tin này không còn nhận đơn.", code: 409 };
  }

  const seller = await getSellerById(listing.seller_id);
  if (!seller || seller.status !== "approved") {
    return { ok: false, error: "Người bán đang bị tạm khoá.", code: 409 };
  }
  if (seller.user_id === input.buyerId) {
    return { ok: false, error: "Không thể tự mua tin của chính mình.", code: 400 };
  }

  const amount = listing.price;
  const fee = calcFee(amount);
  const code = generateOrderCode();

  const { data, error } = (await untypedFrom(client, "shop_orders")
    .insert({
      code,
      listing_id: listing.id,
      seller_id: listing.seller_id,
      buyer_id: input.buyerId,
      buyer_name: input.buyerName,
      buyer_phone: input.buyerPhone,
      buyer_contact: input.buyerContact,
      buyer_bank: input.buyerBank ?? null,
      amount,
      fee,
      payout_amount: calcPayout(amount),
      status: "pending_agent",
    } as never)
    .select("id")
    .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null };

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được đơn.", code: 500 };
  }

  // Giữ chỗ tin để người khác không đặt trùng
  await untypedFrom(client, "shop_listings").update({ status: "reserved" }).eq("id", listing.id);

  await logEvent({
    orderId: data.id,
    actorId: input.buyerId,
    actorRole: "buyer",
    type: "created",
    message: `Đặt mua "${listing.title}" — ${amount.toLocaleString("vi-VN")}đ`,
  });

  return { ok: true, code };
}

// ── Đi tiếp một bước ───────────────────────────────────────────────────────
export async function applyOrderAction(input: {
  orderId: string;
  actionKey: string;
  party: OrderParty;
  actorId: string;
  message?: string;
  images?: string[];
  secret?: Record<string, string> | null;
}): Promise<ActionResult> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, error: "Không tìm thấy đơn.", code: 404 };

  const action = ORDER_FLOW.find((a) => a.key === input.actionKey);
  if (!action) return { ok: false, error: "Thao tác không hợp lệ.", code: 400 };
  if (action.from !== order.status) {
    return { ok: false, error: "Đơn đã sang bước khác, tải lại trang.", code: 409 };
  }
  if (!action.by.includes(input.party)) {
    return { ok: false, error: "Bạn không có quyền làm bước này.", code: 403 };
  }

  const images = (input.images ?? []).filter(isAllowedImageRef);
  if (images.length < action.images) {
    return {
      ok: false,
      error: `Bước này bắt buộc gửi kèm ${action.images} ảnh chụp màn hình.`,
      code: 400,
    };
  }
  if (action.requireMessage && !(input.message ?? "").trim()) {
    return { ok: false, error: "Bước này bắt buộc nhập nội dung.", code: 400 };
  }

  const patch: Record<string, unknown> = { status: action.to };
  const now = new Date().toISOString();
  if (action.key === "claim") {
    if (order.agent_id && order.agent_id !== input.actorId) {
      return { ok: false, error: "Đơn đã có giao dịch viên khác nhận.", code: 409 };
    }
    patch.agent_id = input.actorId;
    patch.claimed_at = now;
  }
  if (action.key === "confirm_payment") patch.held_at = now;
  if (action.key === "deliver") patch.delivered_at = now;
  if (action.key === "received") patch.confirmed_at = now;
  if (action.key === "payout") patch.completed_at = now;

  const { error } = (await untypedFrom(client, "shop_orders")
    .update(patch as never)
    .eq("id", order.id)
    .eq("status", action.from)) as { error: { message: string } | null };
  if (error) return { ok: false, error: error.message, code: 500 };

  await logEvent({
    orderId: order.id,
    actorId: input.actorId,
    actorRole: input.party,
    type: action.event,
    message: input.message,
    images,
    // Chỉ bước bàn giao mới có thông tin tài khoản
    secret: action.key === "deliver" ? input.secret ?? null : null,
  });

  // Đơn xong: đánh dấu tin đã bán + cộng uy tín người bán
  if (action.to === "completed") {
    await untypedFrom(client, "shop_listings")
      .update({ status: "sold", sold_at: now } as never)
      .eq("id", order.listing_id);
    const seller = await getSellerById(order.seller_id);
    if (seller) {
      await untypedFrom(client, "shop_sellers")
        .update({ orders_done: (seller.orders_done ?? 0) + 1 } as never)
        .eq("id", seller.id);
    }
    await logEvent({
      orderId: order.id,
      actorId: null,
      actorRole: "system",
      type: "completed",
      message: "Đơn hoàn tất. Tiền đã chuyển cho người bán.",
    });
  }

  return { ok: true, status: action.to };
}

// ── Huỷ đơn ────────────────────────────────────────────────────────────────
export async function cancelOrder(input: {
  orderId: string;
  party: OrderParty;
  actorId: string;
  reason: string;
  images?: string[];
}): Promise<ActionResult> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, error: "Không tìm thấy đơn.", code: 404 };
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return { ok: false, error: "Đơn ở bước này không huỷ được, hãy mở tranh chấp.", code: 409 };
  }
  // Khi tiền đã bị giữ, chỉ trung gian/admin được huỷ (phải hoàn tiền)
  if (order.status === "holding" && !["agent", "admin"].includes(input.party)) {
    return { ok: false, error: "Tiền đang được giữ — liên hệ giao dịch viên để huỷ.", code: 403 };
  }
  if (!input.reason.trim()) {
    return { ok: false, error: "Cần nêu lý do huỷ.", code: 400 };
  }

  const now = new Date().toISOString();
  await untypedFrom(client, "shop_orders")
    .update({ status: "cancelled", cancel_reason: input.reason, cancelled_at: now } as never)
    .eq("id", order.id);

  // Trả tin về trạng thái đang bán
  await untypedFrom(client, "shop_listings")
    .update({ status: "active" } as never)
    .eq("id", order.listing_id)
    .eq("status", "reserved");

  await logEvent({
    orderId: order.id,
    actorId: input.actorId,
    actorRole: input.party,
    type: "cancelled",
    message: input.reason,
    images: input.images,
  });

  return { ok: true, status: "cancelled" };
}

// ── Tranh chấp ─────────────────────────────────────────────────────────────
export async function openDispute(input: {
  orderId: string;
  party: OrderParty;
  actorId: string;
  reason: string;
  images?: string[];
}): Promise<ActionResult> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, error: "Không tìm thấy đơn.", code: 404 };
  if (!DISPUTABLE_STATUSES.includes(order.status)) {
    return { ok: false, error: "Bước này chưa mở tranh chấp được.", code: 409 };
  }
  if (input.party !== "buyer" && input.party !== "seller" && input.party !== "agent") {
    return { ok: false, error: "Chỉ người trong đơn mới mở được tranh chấp.", code: 403 };
  }
  if (!input.reason.trim()) return { ok: false, error: "Cần mô tả vấn đề.", code: 400 };

  await untypedFrom(client, "shop_disputes").insert({
    order_id: order.id,
    opened_by: input.actorId,
    opened_role: input.party,
    reason: input.reason,
    images: input.images ?? [],
    status: "open",
  } as never);

  await untypedFrom(client, "shop_orders").update({ status: "disputed" } as never).eq("id", order.id);

  await logEvent({
    orderId: order.id,
    actorId: input.actorId,
    actorRole: input.party,
    type: "dispute_opened",
    message: input.reason,
    images: input.images,
  });

  return { ok: true, status: "disputed" };
}

/** Admin/GDV chốt tranh chấp: hoàn tiền người mua hoặc trả tiền người bán. */
export async function resolveDispute(input: {
  orderId: string;
  actorId: string;
  outcome: "refund_buyer" | "pay_seller";
  resolution: string;
  images?: string[];
}): Promise<ActionResult> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, error: "Không tìm thấy đơn.", code: 404 };
  if (order.status !== "disputed") {
    return { ok: false, error: "Đơn này không đang tranh chấp.", code: 409 };
  }
  if ((input.images ?? []).length < 1) {
    return { ok: false, error: "Phải đính kèm ảnh chuyển/hoàn tiền.", code: 400 };
  }

  const now = new Date().toISOString();
  const nextStatus: OrderStatus = input.outcome === "pay_seller" ? "completed" : "cancelled";

  await untypedFrom(client, "shop_disputes")
    .update({
      status: input.outcome,
      resolution: input.resolution,
      handled_by: input.actorId,
      resolved_at: now,
    } as never)
    .eq("order_id", order.id)
    .in("status", ["open", "resolving"]);

  await untypedFrom(client, "shop_orders")
    .update({
      status: nextStatus,
      ...(nextStatus === "completed" ? { completed_at: now } : { cancelled_at: now, cancel_reason: input.resolution }),
    } as never)
    .eq("id", order.id);

  await untypedFrom(client, "shop_listings")
    .update(
      (nextStatus === "completed"
        ? { status: "sold", sold_at: now }
        : { status: "active" }) as never,
    )
    .eq("id", order.listing_id);

  await logEvent({
    orderId: order.id,
    actorId: input.actorId,
    actorRole: "admin",
    type: "dispute_resolved",
    message: `${input.outcome === "pay_seller" ? "Trả tiền người bán" : "Hoàn tiền người mua"} — ${input.resolution}`,
    images: input.images,
  });

  return { ok: true, status: nextStatus };
}

// ── Đánh giá người bán ─────────────────────────────────────────────────────
/**
 * Chỉ người mua của một đơn đã hoàn tất mới chấm điểm được, và chỉ một lần.
 * Điểm cộng vào `shop_sellers` qua trigger `shop_reviews_apply`.
 */
export async function submitReview(input: {
  orderId: string;
  buyerId: string;
  rating: number;
  comment: string;
}): Promise<{ ok: true } | { ok: false; error: string; code: number }> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const order = await getOrderById(input.orderId);
  if (!order) return { ok: false, error: "Không tìm thấy đơn.", code: 404 };
  if (order.buyer_id !== input.buyerId) {
    return { ok: false, error: "Chỉ người mua trong đơn mới đánh giá được.", code: 403 };
  }
  if (order.status !== "completed") {
    return { ok: false, error: "Đơn xong mới đánh giá được.", code: 409 };
  }

  const rating = Math.round(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Điểm phải từ 1 đến 5 sao.", code: 400 };
  }

  const { data: existing } = (await untypedFrom(client, "shop_reviews")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle()) as { data: { id: string } | null };
  if (existing) return { ok: false, error: "Bạn đã đánh giá đơn này rồi.", code: 409 };

  const { error } = (await untypedFrom(client, "shop_reviews").insert({
    order_id: order.id,
    seller_id: order.seller_id,
    buyer_id: input.buyerId,
    rating,
    comment: input.comment.slice(0, 500),
  } as never)) as { error: { message: string } | null };
  if (error) return { ok: false, error: error.message, code: 500 };

  return { ok: true };
}

export type { ShopOrder, ShopSeller };
