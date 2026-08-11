import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  LISTING_SORTS,
  getSellerByUser,
  isAgentRole,
  isShopAdminRole,
  listListings,
  type ListingSort,
} from "@/lib/server/shop";
import {
  LISTING_STATUS_LABEL,
  MAX_LISTING_IMAGES,
  MAX_PRICE,
  MIN_PRICE,
  type ListingKind,
  type ListingStatus,
} from "@/lib/constants/shop";
import { shopJson } from "@/lib/server/shop-privacy";

/** Danh sách tin công khai + đăng tin mới (người bán đã duyệt). */

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-listings", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");

  // Chỉ staff mới lọc được tin chưa lên sàn (chờ duyệt / bị từ chối / đã gỡ)
  const wanted = sp.get("status");
  let status: ListingStatus | undefined;
  if (wanted && wanted in LISTING_STATUS_LABEL) {
    const auth = await getAuthContext();
    if (!isShopAdminRole(auth.role) && !isAgentRole(auth.role)) {
      return shopJson({ error: "Không có quyền." }, { status: 403 });
    }
    status = wanted as ListingStatus;
  }

  // Hàng chờ "xin đẩy nổi bật" — chỉ nhân sự xem được, vì nó lộ ý định của
  // người bán chứ không phải thông tin công khai của tin.
  const featureRequests = sp.get("featureRequests") === "1";
  if (featureRequests) {
    const auth = await getAuthContext();
    if (!isShopAdminRole(auth.role) && !isAgentRole(auth.role)) {
      return shopJson({ error: "Không có quyền." }, { status: 403 });
    }
  }

  const sort = sp.get("sort") ?? "";

  const listings = await listListings({
    kind: kind === "account" || kind === "item" ? kind : undefined,
    status,
    search: sp.get("q")?.slice(0, 60) || undefined,
    minPrice: sp.get("min") ? Number(sp.get("min")) : undefined,
    maxPrice: sp.get("max") ? Number(sp.get("max")) : undefined,
    sort: (LISTING_SORTS as string[]).includes(sort) ? (sort as ListingSort) : undefined,
    featuredOnly: sp.get("featured") === "1",
    featureRequestedOnly: featureRequests,
    // Hàng chờ nằm rải ở mọi trạng thái người bán đang bán, không riêng "active"
    // — nên bỏ bộ lọc trạng thái mặc định để không cắt mất yêu cầu nào.
    ...(featureRequests && !status ? { status: ["active", "reserved"] as ListingStatus[] } : {}),
    limit: Math.min(100, Number(sp.get("limit") ?? 60) || 60),
  });
  return shopJson({ listings });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-listing-create", limit: 20, windowMs: 3_600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const seller = await getSellerByUser(auth.userId);
  if (!seller || seller.status !== "approved") {
    return shopJson(
      { error: "Bạn cần được duyệt hồ sơ người bán trước khi đăng tin." },
      { status: 403 },
    );
  }

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  const price = Number(body.price);
  const kind: ListingKind = body.kind === "item" ? "item" : "account";
  const images = Array.isArray(body.images)
    ? (body.images as unknown[]).filter((u): u is string => typeof u === "string" && u.startsWith("http")).slice(0, MAX_LISTING_IMAGES)
    : [];

  if (title.length < 8) return shopJson({ error: "Tiêu đề quá ngắn." }, { status: 400 });
  if (description.length < 20) {
    return shopJson({ error: "Mô tả cần chi tiết hơn (tối thiểu 20 ký tự)." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return shopJson({ error: "Giá không hợp lệ." }, { status: 400 });
  }
  if (images.length < 1) {
    return shopJson({ error: "Phải có ít nhất 1 ảnh chụp acc/vật phẩm." }, { status: 400 });
  }

  const details: Record<string, string> = {};
  if (body.details && typeof body.details === "object") {
    for (const [k, v] of Object.entries(body.details as Record<string, unknown>).slice(0, 20)) {
      if (typeof v === "string" || typeof v === "number") details[k.slice(0, 30)] = String(v).slice(0, 120);
    }
  }

  const status: ListingStatus = "pending"; // luôn qua duyệt trước khi lên sàn
  const { data, error } = (await untypedFrom(db, "shop_listings")
    .insert({
      seller_id: seller.id,
      kind,
      title,
      description,
      price: Math.round(price),
      negotiable: body.negotiable === true,
      images,
      details,
      game_uid: typeof body.gameUid === "string" ? body.gameUid.trim().slice(0, 20) : null,
      status,
    } as never)
    .select("id")
    .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null };

  if (error) return shopJson({ error: error.message }, { status: 500 });
  return shopJson({ ok: true, id: data?.id }, { status: 201 });
}
