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
import {
  accessForSeller,
  listAccessibleShops,
  listStaffMemberships,
} from "@/lib/server/shop-staff";
import type {
  PublicSeller,
  SellerAccess,
  ShopDispute,
  ShopListing,
  ShopOrder,
  ShopOrderEvent,
  ShopReview,
  ShopSeller,
  ShopStaffMembership,
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

// ── Lỗi truy vấn ───────────────────────────────────────────────────────────
type PgError = { message: string; code?: string } | null;

/**
 * Ghi lại lỗi truy vấn thay vì bỏ qua.
 *
 * Trước đây mọi hàm ở file này chỉ destructure `data`, nên khi PostgREST trả
 * lỗi thì `data` là null và hàm trả về mảng rỗng — giao diện hiện "không có dữ
 * liệu" thay vì báo hỏng, và không có lấy một dòng log. Đúng bẫy đó đã làm toàn
 * bộ tin đăng biến mất khỏi cả /shop lẫn màn duyệt của admin khi thiếu cột
 * `bumped_at`.
 */
function logQueryError(label: string, error: PgError): void {
  if (!error) return;
  console.error(`[shop] ${label} lỗi ${error.code ?? "?"}: ${error.message}`);
}

/** 42703 = undefined_column. Dấu hiệu schema chưa chạy migration. */
function isUndefinedColumn(error: PgError): boolean {
  return error?.code === "42703";
}

/**
 * `bumped_at` và `featured_until` chỉ tồn tại sau khi chạy
 * `supabase/migration-shop-v2-discord.sql`.
 *
 * Thiếu chúng thì truy vấn sắp xếp mặc định hỏng và chợ trông như trống trơn,
 * nên ở đây tự hạ cấp về `created_at` để việc duyệt tin không bị chặn. Nhớ kết
 * quả dò trong 5 phút: đã chạy migration thì không phải trả giá cho lần thử
 * hỏng, mà chạy migration muộn cũng tự khỏi chứ không cần restart.
 */
let listingV2Columns: { present: boolean; checkedAt: number } | null = null;
const V2_RECHECK_MS = 5 * 60_000;

function knownListingV2State(): boolean | null {
  if (!listingV2Columns) return null;
  if (listingV2Columns.present) return true;
  return Date.now() - listingV2Columns.checkedAt < V2_RECHECK_MS ? false : null;
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
    // Hai trường trang trí gian hàng — chủ shop tự viết nên vốn đã là công khai.
    bio: s.bio ?? null,
    avatar_url: s.avatar_url ?? null,
    orders_done: s.orders_done,
    rating: s.rating_count > 0 ? Math.round((s.rating_sum / s.rating_count) * 10) / 10 : null,
    rating_count: s.rating_count,
    created_at: s.created_at,
  };
}

export async function getSellerByUser(userId: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as { data: ShopSeller | null ; error: PgError };
  logQueryError("getSellerByUser", error);
  return data;
}

export async function getSellerById(id: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopSeller | null ; error: PgError };
  logQueryError("getSellerById", error);
  return data;
}

export async function listSellers(status?: string): Promise<ShopSeller[]> {
  const client = db();
  if (!client) return [];
  let q = untypedFrom(client, "shop_sellers").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = (await q) as { data: ShopSeller[] | null ; error: PgError };
  logQueryError("listSellers", error);
  return data ?? [];
}

// ── Tin đăng ───────────────────────────────────────────────────────────────
/** Cách sắp xếp chợ. `new` = theo lần đẩy tin gần nhất, không phải ngày đăng. */
export type ListingSort = "new" | "price_asc" | "price_desc" | "popular";

export const LISTING_SORTS: ListingSort[] = ["new", "price_asc", "price_desc", "popular"];

type ListingFilter = {
  kind?: ListingKind;
  status?: ListingStatus | ListingStatus[];
  sellerId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
  /** Chỉ lấy tin đang còn hạn nổi bật. */
  featuredOnly?: boolean;
  /** Chỉ lấy tin người bán đang xin đẩy nổi bật (hàng chờ của admin). */
  featureRequestedOnly?: boolean;
  /** Chỉ lấy tin đang có đợt giảm giá còn hiệu lực. */
  onSaleOnly?: boolean;
  limit?: number;
};

type ListingsResult = { data: ShopListing[] | null; error: PgError };

/** Dựng truy vấn tin đăng. `v2` = schema đã có bumped_at/featured_until. */
function buildListingQuery(
  client: NonNullable<ReturnType<typeof db>>,
  filter: ListingFilter,
  v2: boolean,
) {
  let q = untypedFrom(client, "shop_listings").select("*").limit(filter.limit ?? 60);

  // Hàng chờ duyệt nổi bật xếp theo thứ tự xin — ai giơ tay trước được xét
  // trước. Phải đặt trước khối sort bên dưới: PostgREST gom các lần .order()
  // theo thứ tự gọi, gọi sau thì chỉ còn là khoá phụ.
  if (filter.featureRequestedOnly) {
    q = q.order("featured_requested_at", { ascending: true });
  }

  switch (filter.sort ?? "new") {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "popular":
      q = q.order("views", { ascending: false });
      break;
    default:
      // Tin cũ chưa có `bumped_at` (trước migration v2) vẫn phải xuất hiện, nên
      // xếp NULL xuống cuối chứ không loại.
      if (v2) q = q.order("bumped_at", { ascending: false, nullsFirst: false });
      q = q.order("created_at", { ascending: false });
  }

  const status = filter.status ?? PUBLIC_LISTING_STATUSES;
  q = Array.isArray(status) ? q.in("status", status) : q.eq("status", status);
  if (filter.kind) q = q.eq("kind", filter.kind);
  if (filter.sellerId) q = q.eq("seller_id", filter.sellerId);
  // Tìm cả trong mô tả: người mua hay gõ tên skin/nhân vật, thứ chỉ nằm ở đó.
  if (filter.search) {
    const term = filter.search.replace(/[%,()]/g, " ").trim();
    if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (filter.minPrice != null) q = q.gte("price", filter.minPrice);
  if (filter.maxPrice != null) q = q.lte("price", filter.maxPrice);
  if (v2 && filter.featuredOnly) q = q.gt("featured_until", new Date().toISOString());
  // Cột này đến từ migration-shop-featured-request.sql, muộn hơn nhóm v2 — nên
  // không gộp vào cờ `v2`. Thiếu cột thì listListings bắt 42703 và trả rỗng.
  if (filter.featureRequestedOnly) q = q.not("featured_requested_at", "is", null);
  // Đang giảm giá = có giá giảm và (không hạn, hoặc hạn còn ở tương lai). Lọc
  // ngay dưới CSDL chứ không lấy hết rồi lọc bằng isSaleLive() — nếu không thì
  // `limit` cắt trước, và trang chỉ hiện được vài tin giảm nằm lẫn trong mẻ đầu.
  if (filter.onSaleOnly) {
    q = q.not("sale_price", "is", null).or(`sale_until.is.null,sale_until.gt.${new Date().toISOString()}`);
  }

  return q;
}

export async function listListings(filter: ListingFilter = {}): Promise<ShopListing[]> {
  const client = db();
  if (!client) return [];

  const attempt = async (v2: boolean): Promise<ListingsResult> =>
    (await buildListingQuery(client, filter, v2)) as ListingsResult;

  const known = knownListingV2State();
  // Chưa biết thì cứ giả định schema đầy đủ — trường hợp bình thường.
  let usedV2 = known !== false;
  let { data, error } = await attempt(usedV2);

  // Hàng chờ nổi bật đọc cột của một migration muộn hơn nhóm v2. Thiếu đúng cột
  // đó thì hạ cấp xuống v2=false cũng vô ích (bộ lọc vẫn còn), và tệ hơn là sẽ
  // đánh dấu nhầm cả nhóm v2 là "chưa có" suốt 5 phút sau đó.
  if (filter.featureRequestedOnly && isUndefinedColumn(error)) {
    console.warn(
      "[shop] Thiếu cột featured_requested_at trên shop_listings — hãy chạy " +
        "supabase/migration-shop-featured-request.sql. Tạm coi như chưa ai xin nổi bật.",
    );
    return [];
  }

  // Cột giảm giá đến từ migration-shop-sale.sql, cũng muộn hơn nhóm v2 — hạ cấp
  // v2 không cứu được vì bộ lọc vẫn còn đó.
  if (filter.onSaleOnly && isUndefinedColumn(error)) {
    console.warn(
      "[shop] Thiếu cột sale_price/sale_until trên shop_listings — hãy chạy " +
        "supabase/migration-shop-sale.sql. Tạm coi như chưa tin nào giảm giá.",
    );
    return [];
  }

  if (usedV2 && isUndefinedColumn(error)) {
    listingV2Columns = { present: false, checkedAt: Date.now() };
    console.warn(
      "[shop] Thiếu cột bumped_at/featured_until trên shop_listings — hãy chạy " +
        "supabase/migration-shop-v2-discord.sql. Tạm sắp xếp theo created_at.",
    );
    usedV2 = false;
    ({ data, error } = await attempt(false));
  } else if (usedV2 && !error) {
    listingV2Columns = { present: true, checkedAt: Date.now() };
  }

  // Không có cột hạn nổi bật thì không tin nào đang nổi bật — trả rỗng chứ
  // không trả nhầm toàn bộ tin thường vào dải "nổi bật".
  if (!usedV2 && filter.featuredOnly) return [];

  logQueryError("listListings", error);
  return attachSellers(data ?? []);
}

/** Dải tin nổi bật đầu trang chợ. */
export function listFeaturedListings(limit = 8): Promise<ShopListing[]> {
  return listListings({ status: "active", featuredOnly: true, limit });
}

/** Dải "đang giảm giá" đầu trang chợ. */
export function listSaleListings(limit = 8): Promise<ShopListing[]> {
  return listListings({ status: "active", onSaleOnly: true, limit });
}

/** Gắn hồ sơ người bán (rút gọn) vào danh sách tin — tránh N+1. */
async function attachSellers(rows: ShopListing[]): Promise<ShopListing[]> {
  const client = db();
  if (!client || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.seller_id))];
  const { data, error } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .in("id", ids)) as { data: ShopSeller[] | null ; error: PgError };
  logQueryError("attachSellers", error);
  const map = new Map((data ?? []).map((s) => [s.id, toPublicSeller(s)]));
  return rows.map((r) => ({ ...r, seller: map.get(r.seller_id) ?? null }));
}

export async function getListing(id: string): Promise<ShopListing | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopListing | null ; error: PgError };
  logQueryError("getListing", error);
  if (!data) return null;
  const [withSeller] = await attachSellers([data]);
  return withSeller;
}

export async function bumpListingViews(id: string): Promise<void> {
  const client = db();
  if (!client) return;
  const { data, error } = (await untypedFrom(client, "shop_listings")
    .select("views")
    .eq("id", id)
    .maybeSingle()) as { data: { views: number } | null ; error: PgError };
  logQueryError("bumpListingViews", error);
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
  const { data, error } = (await untypedFrom(client, "shop_orders")
    .select("*")
    .eq("code", code)
    .maybeSingle()) as { data: ShopOrder | null ; error: PgError };
  logQueryError("getOrderByCode", error);
  if (!data) return null;
  return hydrateOrder(data);
}

export async function getOrderById(id: string): Promise<ShopOrder | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopOrder | null ; error: PgError };
  logQueryError("getOrderById", error);
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
  /** Một hoặc nhiều gian hàng — CTV có thể phụ nhiều shop cùng lúc. */
  sellerId?: string | string[];
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
  if (filter.sellerId) {
    if (Array.isArray(filter.sellerId)) {
      // Mảng rỗng nghĩa là "không gian hàng nào" — để lọt sẽ thành xem hết đơn.
      if (filter.sellerId.length === 0) return [];
      q = q.in("seller_id", filter.sellerId);
    } else {
      q = q.eq("seller_id", filter.sellerId);
    }
  }
  if (filter.agentId) q = q.eq("agent_id", filter.agentId);
  if (filter.unclaimed) q = q.is("agent_id", null);
  if (filter.status) {
    q = Array.isArray(filter.status) ? q.in("status", filter.status) : q.eq("status", filter.status);
  } else if (filter.onlyActive) {
    q = q.in("status", ACTIVE_ORDER_STATUSES);
  }

  const { data, error } = (await q) as { data: ShopOrder[] | null ; error: PgError };
  logQueryError("listOrders", error);
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

/**
 * Người xem đang đóng vai gì trong đơn này. `null` = không liên quan.
 *
 * CTV được chủ shop bật quyền xử lý đơn đứng đúng vai "seller": họ làm thay
 * gian hàng, nên thấy và làm được đúng những gì chủ shop thấy và làm — không
 * hơn. Ai bấm thì `actor_id` trong nhật ký vẫn ghi đúng người đó.
 */
export async function partyForOrder(
  order: ShopOrder,
  userId: string | null,
  role: string | null,
): Promise<ViewerParty> {
  if (!userId) return null;
  if (order.buyer_id === userId) return "buyer";
  if (order.agent_id === userId) return "agent";
  const access = await accessForSeller(userId, order.seller_id);
  if (access?.isOwner) return "seller";
  if (access?.canHandleOrders) return "seller";
  if (isShopAdminRole(role)) return "admin";
  if (isAgentRole(role)) return "agent";
  return null;
}

export async function listOrderEvents(orderId: string): Promise<ShopOrderEvent[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = (await untypedFrom(client, "shop_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })) as { data: ShopOrderEvent[] | null ; error: PgError };
  logQueryError("listOrderEvents", error);
  return data ?? [];
}

export async function getDisputeForOrder(orderId: string): Promise<ShopDispute | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: ShopDispute | null ; error: PgError };
  logQueryError("getDisputeForOrder", error);
  return data;
}

export async function getReviewForOrder(orderId: string): Promise<ShopReview | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle()) as { data: ShopReview | null ; error: PgError };
  logQueryError("getReviewForOrder", error);
  return data;
}

/**
 * Đánh giá của một người bán kèm tên người mua.
 *
 * Chỉ lấy tên hiển thị — không kèm id/handle để trang gian hàng công khai
 * không trở thành nơi dò xem ai đã mua gì.
 */
export type SellerReview = ShopReview & { buyer_name: string };

export async function listSellerReviews(sellerId: string, limit = 20): Promise<SellerReview[]> {
  const client = db();
  if (!client) return [];

  const { data, error } = (await untypedFrom(client, "shop_reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit)) as { data: ShopReview[] | null ; error: PgError };
  logQueryError("listSellerReviews", error);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: users } = (await untypedFrom(client, "users")
    .select("id, display_name")
    .in("id", [...new Set(rows.map((r) => r.buyer_id))])) as {
    data: { id: string; display_name: string | null }[] | null;
  };
  const nameMap = new Map((users ?? []).map((u) => [u.id, u.display_name]));

  return rows.map((r) => ({
    ...r,
    buyer_id: "",
    buyer_name: maskBuyerName(nameMap.get(r.buyer_id) ?? null),
  }));
}

/** "Nguyễn Văn An" → "Nguyễn V. A." — đủ để nhận ra người thật, không đủ để tra. */
function maskBuyerName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Người mua ẩn danh";
  if (parts.length === 1) return `${parts[0].slice(0, 4)}***`;
  return `${parts[0]} ${parts.slice(1).map((p) => `${p[0]}.`).join(" ")}`;
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
  const { data, error } = (await q) as { data: ShopDispute[] | null ; error: PgError };
  logQueryError("listDisputes", error);
  return data ?? [];
}

// ── Ngữ cảnh cho trang ─────────────────────────────────────────────────────
export type ShopViewer = {
  userId: string | null;
  role: string;
  /** Gian hàng của chính người này (nếu đã nộp hồ sơ bán). */
  seller: ShopSeller | null;
  /** Mọi gian hàng làm việc được: shop của mình + shop đang làm CTV. */
  shops: SellerAccess[];
  /** Lời mời làm CTV chưa trả lời. */
  invites: ShopStaffMembership[];
  isAgent: boolean;
  isAdmin: boolean;
};

export async function getShopViewer(): Promise<ShopViewer> {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return {
      userId: null,
      role: auth.role,
      seller: null,
      shops: [],
      invites: [],
      isAgent: false,
      isAdmin: false,
    };
  }

  const [shops, invites] = await Promise.all([
    listAccessibleShops(auth.userId),
    listStaffMemberships(auth.userId, ["invited"]),
  ]);

  return {
    userId: auth.userId,
    role: auth.role,
    seller: shops.find((s) => s.isOwner)?.seller ?? null,
    shops,
    invites,
    isAgent: isAgentRole(auth.role),
    isAdmin: isShopAdminRole(auth.role),
  };
}

/**
 * Gian hàng đang được thao tác trên các trang của người bán.
 *
 * Người vừa có shop riêng vừa làm CTV chỗ khác thì cần chọn; `?shop=<id>` trên
 * URL quyết định, không hợp lệ thì rơi về shop đầu tiên (shop của chính mình).
 */
export function pickShop(
  shops: SellerAccess[],
  sellerId: string | null | undefined,
): SellerAccess | null {
  if (shops.length === 0) return null;
  return shops.find((s) => s.seller.id === sellerId) ?? shops[0];
}
