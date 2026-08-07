import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getAuthContext } from "@/lib/server/auth";
import {
  ACTIVE_ORDER_STATUSES,
  PUBLIC_LISTING_STATUSES,
  calcFee,
  calcPayout,
  type ListingKind,
  type ListingStatus,
  type OrderStatus,
} from "@/lib/constants/shop";
import type {
  PublicSeller,
  ShopDispute,
  ShopListing,
  ShopOrder,
  ShopOrderEvent,
  ShopReview,
  ShopSeller,
  ViewerParty,
} from "@/lib/types/shop";

/**
 * Truy cập dữ liệu chợ Arex.
 *
 * Mọi thao tác dùng service-role client rồi tự kiểm tra quyền trong code —
 * RLS trong migration chỉ là lớp chặn thứ hai cho client gọi thẳng.
 */

function db() {
  return createAdminSupabaseClient();
}

/** Vai trò được phép làm trung gian. */
const AGENT_ROLES = ["super_admin", "admin", "it", "manager", "agent"];

export function isAgentRole(role: string | null | undefined): boolean {
  return !!role && AGENT_ROLES.includes(role);
}

export function isShopAdminRole(role: string | null | undefined): boolean {
  return !!role && ["super_admin", "admin", "it", "manager"].includes(role);
}

// ── Người bán ──────────────────────────────────────────────────────────────
/**
 * Hồ sơ người bán rút gọn.
 *
 * `contact` (Zalo/Facebook/Telegram của người bán) KHÔNG đi kèm mặc định —
 * trang tin đăng công khai từng gửi kèm nó trong payload dù không hiển thị, ai
 * mở tab Network cũng nhặt được. Chỉ bật `withContact` ở những chỗ đã chặn
 * quyền sẵn, tức là trong một đơn hàng cụ thể.
 */
export function toPublicSeller(
  s: ShopSeller | null | undefined,
  options: { withContact?: boolean } = {},
): PublicSeller | null {
  if (!s) return null;
  return {
    id: s.id,
    user_id: s.user_id,
    display_name: s.display_name,
    ...(options.withContact ? { contact: s.contact } : {}),
    orders_done: s.orders_done,
    rating: s.rating_count > 0 ? Math.round((s.rating_sum / s.rating_count) * 10) / 10 : null,
    rating_count: s.rating_count,
    created_at: s.created_at,
  };
}

export async function getSellerByUser(userId: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as { data: ShopSeller | null };
  return data;
}

export async function getSellerById(id: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopSeller | null };
  return data;
}

export async function listSellers(status?: string): Promise<ShopSeller[]> {
  const client = db();
  if (!client) return [];
  let q = untypedFrom(client, "shop_sellers").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = (await q) as { data: ShopSeller[] | null };
  return data ?? [];
}

// ── Tin đăng ───────────────────────────────────────────────────────────────
type ListingFilter = {
  kind?: ListingKind;
  status?: ListingStatus | ListingStatus[];
  sellerId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
};

export async function listListings(filter: ListingFilter = {}): Promise<ShopListing[]> {
  const client = db();
  if (!client) return [];

  let q = untypedFrom(client, "shop_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 60);

  const status = filter.status ?? PUBLIC_LISTING_STATUSES;
  q = Array.isArray(status) ? q.in("status", status) : q.eq("status", status);
  if (filter.kind) q = q.eq("kind", filter.kind);
  if (filter.sellerId) q = q.eq("seller_id", filter.sellerId);
  if (filter.search) q = q.ilike("title", `%${filter.search}%`);
  if (filter.minPrice != null) q = q.gte("price", filter.minPrice);
  if (filter.maxPrice != null) q = q.lte("price", filter.maxPrice);

  const { data } = (await q) as { data: ShopListing[] | null };
  const rows = data ?? [];
  return attachSellers(rows);
}

/** Gắn hồ sơ người bán (rút gọn) vào danh sách tin — tránh N+1. */
async function attachSellers(rows: ShopListing[]): Promise<ShopListing[]> {
  const client = db();
  if (!client || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.seller_id))];
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .in("id", ids)) as { data: ShopSeller[] | null };
  const map = new Map((data ?? []).map((s) => [s.id, toPublicSeller(s)]));
  return rows.map((r) => ({ ...r, seller: map.get(r.seller_id) ?? null }));
}

export async function getListing(id: string): Promise<ShopListing | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopListing | null };
  if (!data) return null;
  const [withSeller] = await attachSellers([data]);
  return withSeller;
}

export async function bumpListingViews(id: string): Promise<void> {
  const client = db();
  if (!client) return;
  const { data } = (await untypedFrom(client, "shop_listings")
    .select("views")
    .eq("id", id)
    .maybeSingle()) as { data: { views: number } | null };
  if (!data) return;
  await untypedFrom(client, "shop_listings")
    .update({ views: (data.views ?? 0) + 1 })
    .eq("id", id);
}

// ── Đơn hàng ───────────────────────────────────────────────────────────────
/** Mã đơn ngắn, dễ đọc qua điện thoại: AX-7KQ4P2 */
export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `AX-${s}`;
}

export { calcFee, calcPayout };

export async function getOrderByCode(code: string): Promise<ShopOrder | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_orders")
    .select("*")
    .eq("code", code)
    .maybeSingle()) as { data: ShopOrder | null };
  if (!data) return null;
  return hydrateOrder(data);
}

export async function getOrderById(id: string): Promise<ShopOrder | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopOrder | null };
  if (!data) return null;
  return hydrateOrder(data);
}

async function hydrateOrder(order: ShopOrder): Promise<ShopOrder> {
  const client = db();
  if (!client) return order;
  const [listing, seller] = await Promise.all([
    untypedFrom(client, "shop_listings")
      .select("id,title,images,kind")
      .eq("id", order.listing_id)
      .maybeSingle(),
    getSellerById(order.seller_id),
  ]);
  return {
    ...order,
    listing: (listing.data as ShopOrder["listing"]) ?? null,
    // Trong một đơn thì hai bên cần liên hệ được với nhau qua giao dịch viên.
    seller: toPublicSeller(seller, { withContact: true }),
  };
}

type OrderFilter = {
  buyerId?: string;
  sellerId?: string;
  agentId?: string;
  status?: OrderStatus | OrderStatus[];
  onlyActive?: boolean;
  unclaimed?: boolean;
  limit?: number;
};

export async function listOrders(filter: OrderFilter = {}): Promise<ShopOrder[]> {
  const client = db();
  if (!client) return [];

  let q = untypedFrom(client, "shop_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);

  if (filter.buyerId) q = q.eq("buyer_id", filter.buyerId);
  if (filter.sellerId) q = q.eq("seller_id", filter.sellerId);
  if (filter.agentId) q = q.eq("agent_id", filter.agentId);
  if (filter.unclaimed) q = q.is("agent_id", null);
  if (filter.status) {
    q = Array.isArray(filter.status) ? q.in("status", filter.status) : q.eq("status", filter.status);
  } else if (filter.onlyActive) {
    q = q.in("status", ACTIVE_ORDER_STATUSES);
  }

  const { data } = (await q) as { data: ShopOrder[] | null };
  const rows = data ?? [];
  if (rows.length === 0) return rows;

  // Gắn kèm tin đăng + người bán cho danh sách
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const [listings, sellers] = await Promise.all([
    untypedFrom(client, "shop_listings").select("id,title,images,kind").in("id", listingIds),
    untypedFrom(client, "shop_sellers").select("*").in("id", sellerIds),
  ]);
  const lMap = new Map(((listings.data ?? []) as NonNullable<ShopOrder["listing"]>[]).map((l) => [l.id, l]));
  const sMap = new Map(
    ((sellers.data ?? []) as ShopSeller[]).map((s) => [s.id, toPublicSeller(s, { withContact: true })]),
  );
  return rows.map((r) => ({
    ...r,
    listing: lMap.get(r.listing_id) ?? null,
    seller: sMap.get(r.seller_id) ?? null,
  }));
}

/** Người xem đang đóng vai gì trong đơn này. `null` = không liên quan. */
export async function partyForOrder(
  order: ShopOrder,
  userId: string | null,
  role: string | null,
): Promise<ViewerParty> {
  if (!userId) return null;
  if (order.buyer_id === userId) return "buyer";
  if (order.agent_id === userId) return "agent";
  const seller = await getSellerById(order.seller_id);
  if (seller?.user_id === userId) return "seller";
  if (isShopAdminRole(role)) return "admin";
  if (isAgentRole(role)) return "agent";
  return null;
}

export async function listOrderEvents(orderId: string): Promise<ShopOrderEvent[]> {
  const client = db();
  if (!client) return [];
  const { data } = (await untypedFrom(client, "shop_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })) as { data: ShopOrderEvent[] | null };
  return data ?? [];
}

export async function getDisputeForOrder(orderId: string): Promise<ShopDispute | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: ShopDispute | null };
  return data;
}

export async function getReviewForOrder(orderId: string): Promise<ShopReview | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle()) as { data: ShopReview | null };
  return data;
}

/** Danh sách tranh chấp cho bàn làm việc của admin. */
export async function listDisputes(status?: string): Promise<ShopDispute[]> {
  const client = db();
  if (!client) return [];
  let q = untypedFrom(client, "shop_disputes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data } = (await q) as { data: ShopDispute[] | null };
  return data ?? [];
}

// ── Ngữ cảnh cho trang ─────────────────────────────────────────────────────
export type ShopViewer = {
  userId: string | null;
  role: string;
  seller: ShopSeller | null;
  isAgent: boolean;
  isAdmin: boolean;
};

export async function getShopViewer(): Promise<ShopViewer> {
  const auth = await getAuthContext();
  const seller = auth.userId ? await getSellerByUser(auth.userId) : null;
  return {
    userId: auth.userId,
    role: auth.role,
    seller,
    isAgent: isAgentRole(auth.role),
    isAdmin: isShopAdminRole(auth.role),
  };
}
