import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { isAllowedImageRef } from "@/lib/server/shop-files";
import type { OrderParty } from "@/lib/constants/shop";

/**
 * Hộp thoại trong một đơn hàng.
 *
 * Vì sao không để hai bên tự trao đổi Zalo/Facebook: chợ này có trung gian giữ
 * tiền, mà mọi vụ mất tiền đều bắt đầu bằng một câu "nhắn riêng cho anh nhé".
 * Nên số điện thoại, link ngoài, mã QR, tên tài khoản mạng xã hội đều bị che
 * ngay khi lưu — bản gốc vẫn cất trong `raw_body` để admin đối chiếu khi có
 * tranh chấp, còn cái hiện ra cho người trong đơn thì đã sạch.
 */

export type ShopMessage = {
  id: string;
  order_id: string;
  sender_id: string | null;
  sender_role: OrderParty;
  body: string;
  images: string[];
  flagged: boolean;
  created_at: string;
};

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MESSAGE_IMAGES = 4;

function db() {
  return createAdminSupabaseClient();
}

// ── Lọc rủi ro "kéo nhau ra ngoài sàn" ──────────────────────────────────────
const RISKY_PATTERNS: { re: RegExp; replace: string }[] = [
  // Số điện thoại VN, kể cả khi viết cách ra hoặc chèn dấu chấm.
  { re: /(?:\+?84|0)[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d[\s.\-]?\d/g, replace: "[số điện thoại đã ẩn]" },
  // Link ra ngoài — trừ chính site Arex.
  { re: /https?:\/\/(?!(?:www\.)?arexnetwork\.site)[^\s]+/gi, replace: "[link đã ẩn]" },
  // Rủ chuyển kênh: zalo/tele/fb + định danh đi kèm.
  { re: /\b(zalo|telegram|tele|messenger|facebook|fb|viber|whatsapp|momo|banking)\b\s*[:\-]?\s*\S{4,}/gi, replace: "[thông tin liên hệ đã ẩn]" },
  // Số tài khoản ngân hàng viết trần.
  { re: /\b\d{9,19}\b/g, replace: "[dãy số đã ẩn]" },
];

export type FilterResult = { clean: string; flagged: boolean };

export function filterMessage(raw: string): FilterResult {
  let clean = raw;
  let flagged = false;
  for (const { re, replace } of RISKY_PATTERNS) {
    if (re.test(clean)) {
      flagged = true;
      clean = clean.replace(re, replace);
    }
    re.lastIndex = 0;
  }
  return { clean, flagged };
}

// ── Đọc / ghi ───────────────────────────────────────────────────────────────
export async function listMessages(orderId: string, limit = 200): Promise<ShopMessage[]> {
  const client = db();
  if (!client) return [];
  const { data } = (await untypedFrom(client, "shop_messages")
    .select("id, order_id, sender_id, sender_role, body, images, flagged, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(limit)) as { data: ShopMessage[] | null };
  return data ?? [];
}

export type SendResult =
  | { ok: true; message: ShopMessage; flagged: boolean }
  | { ok: false; error: string; code: number };

export async function sendMessage(input: {
  orderId: string;
  senderId: string;
  senderRole: OrderParty;
  body: string;
  images?: string[];
}): Promise<SendResult> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const raw = input.body.trim().slice(0, MAX_MESSAGE_LENGTH);
  const images = (input.images ?? []).filter(isAllowedImageRef).slice(0, MAX_MESSAGE_IMAGES);
  if (!raw && images.length === 0) {
    return { ok: false, error: "Nhập nội dung hoặc gửi ảnh.", code: 400 };
  }

  const { clean, flagged } = filterMessage(raw);

  const { data, error } = (await untypedFrom(client, "shop_messages")
    .insert({
      order_id: input.orderId,
      sender_id: input.senderId,
      sender_role: input.senderRole,
      body: clean,
      images,
      raw_body: flagged ? raw : null,
      flagged,
    } as never)
    .select("id, order_id, sender_id, sender_role, body, images, flagged, created_at")
    .maybeSingle()) as { data: ShopMessage | null; error: { message: string } | null };

  if (error || !data) return { ok: false, error: error?.message ?? "Không gửi được.", code: 500 };

  await markRead(input.orderId, input.senderId);
  return { ok: true, message: data, flagged };
}

/** Dòng hệ thống — dùng khi máy trạng thái muốn để lại lời nhắc trong hộp thoại. */
export async function postSystemMessage(orderId: string, body: string): Promise<void> {
  const client = db();
  if (!client) return;
  await untypedFrom(client, "shop_messages").insert({
    order_id: orderId,
    sender_id: null,
    sender_role: "system",
    body: body.slice(0, MAX_MESSAGE_LENGTH),
  } as never);
}

// ── Mốc đã đọc ──────────────────────────────────────────────────────────────
export async function markRead(orderId: string, userId: string): Promise<void> {
  const client = db();
  if (!client) return;
  await untypedFrom(client, "shop_message_reads").upsert(
    { order_id: orderId, user_id: userId, last_read_at: new Date().toISOString() } as never,
    { onConflict: "order_id,user_id" },
  );
}

export async function unreadCount(orderId: string, userId: string): Promise<number> {
  const client = db();
  if (!client) return 0;

  const { data: mark } = (await untypedFrom(client, "shop_message_reads")
    .select("last_read_at")
    .eq("order_id", orderId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: { last_read_at: string } | null };

  let q = untypedFrom(client, "shop_messages")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .neq("sender_id", userId);
  if (mark?.last_read_at) q = q.gt("created_at", mark.last_read_at);

  const { count } = (await q) as { count: number | null };
  return count ?? 0;
}

/** Số tin chưa đọc cho nhiều đơn cùng lúc — dùng ở danh sách đơn. */
export async function unreadCounts(
  orderIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  const client = db();
  const out = new Map<string, number>();
  if (!client || orderIds.length === 0) return out;

  const [markRes, messageRes] = await Promise.all([
    untypedFrom(client, "shop_message_reads")
      .select("order_id, last_read_at")
      .eq("user_id", userId)
      .in("order_id", orderIds),
    untypedFrom(client, "shop_messages")
      .select("order_id, sender_id, created_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const marks = markRes.data as { order_id: string; last_read_at: string }[] | null;
  const messages = messageRes.data as
    | { order_id: string; sender_id: string | null; created_at: string }[]
    | null;

  const markMap = new Map((marks ?? []).map((m) => [m.order_id, Date.parse(m.last_read_at)]));
  for (const m of messages ?? []) {
    if (m.sender_id === userId) continue;
    const since = markMap.get(m.order_id) ?? 0;
    if (Date.parse(m.created_at) > since) out.set(m.order_id, (out.get(m.order_id) ?? 0) + 1);
  }
  return out;
}
