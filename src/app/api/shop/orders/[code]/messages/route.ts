import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getOrderByCode, partyForOrder } from "@/lib/server/shop";
import { shopJson } from "@/lib/server/shop-privacy";
import { listMessages, markRead, sendMessage } from "@/lib/server/shop-messages";
import { notifyOrderMessage } from "@/lib/server/shop-notify";
import { isAllowedImageRef } from "@/lib/server/shop-files";

/**
 * Hộp thoại của một đơn. Ai đọc/ghi được chính là ai vào được đơn — dùng lại
 * `partyForOrder`, không có đường tắt nào riêng cho chat.
 */

async function loadContext(code: string) {
  const auth = await getAuthContext();
  if (!auth.userId) return { error: shopJson({ error: "Chưa đăng nhập." }, { status: 401 }) };
  const order = await getOrderByCode(code);
  if (!order) return { error: shopJson({ error: "Không tìm thấy đơn." }, { status: 404 }) };
  const party = await partyForOrder(order, auth.userId, auth.role);
  if (!party) return { error: shopJson({ error: "Không có quyền xem đơn này." }, { status: 403 }) };
  return { auth, order, party, userId: auth.userId };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(req, { name: "shop-msg-read", limit: 240, windowMs: 60_000 });
  if (limited) return limited;

  const { code } = await params;
  const ctx = await loadContext(code);
  if ("error" in ctx) return ctx.error;

  const messages = await listMessages(ctx.order.id);
  // Mở hộp thoại ra là coi như đã đọc.
  void markRead(ctx.order.id, ctx.userId);

  return shopJson({ messages, party: ctx.party });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(req, { name: "shop-msg-send", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { code } = await params;
  const ctx = await loadContext(code);
  if ("error" in ctx) return ctx.error;

  if (["completed", "cancelled"].includes(ctx.order.status)) {
    return shopJson({ error: "Đơn đã đóng, không nhắn thêm được." }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const images = Array.isArray(body.images)
    ? (body.images as unknown[]).filter(isAllowedImageRef).slice(0, 4)
    : [];

  const result = await sendMessage({
    orderId: ctx.order.id,
    senderId: ctx.userId,
    senderRole: ctx.party,
    body: typeof body.body === "string" ? body.body : "",
    images,
  });

  if (!result.ok) return shopJson({ error: result.error }, { status: result.code });

  void notifyOrderMessage({
    order: ctx.order,
    senderParty: ctx.party,
    senderId: ctx.userId,
    preview: result.message.body || "(gửi ảnh)",
  });

  return shopJson({
    ok: true,
    message: result.message,
    // Client hiện lời nhắc khi có phần bị che, để người gửi không tưởng là mất chữ.
    filtered: result.flagged,
  });
}
