import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getListing, isAgentRole, isShopAdminRole } from "@/lib/server/shop";
import { accessForSeller } from "@/lib/server/shop-staff";
import type { ListingStatus } from "@/lib/constants/shop";
import { shopJson } from "@/lib/server/shop-privacy";
import {
  notifyFeatureRejected,
  notifyListingApproved,
  notifyListingFeatured,
  notifyListingRejected,
} from "@/lib/server/shop-notify";

/** Người bán chỉ đẩy tin được 1 lần / ngày. */
const BUMP_COOLDOWN_MS = 24 * 3_600_000;

/**
 * Sửa tin.
 * - Chủ tin: đổi tiêu đề/mô tả/giá/ảnh, ẩn tin. Sửa xong tin quay lại chờ duyệt.
 * - Staff/GDV: duyệt (`active`), từ chối (`rejected`), gỡ (`hidden`).
 */

const STAFF_STATUSES: ListingStatus[] = ["active", "rejected", "hidden"];
const OWNER_STATUSES: ListingStatus[] = ["hidden", "pending"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-listing-edit", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return shopJson({ error: "Không tìm thấy tin." }, { status: 404 });

  // "Chủ tin" giờ gồm cả CTV được chủ shop bật quyền quản lý tin đăng — họ làm
  // thay gian hàng nên đụng được đúng những gì chủ shop đụng được.
  const access = await accessForSeller(auth.userId, listing.seller_id);
  const isOwner = !!access?.canManageListings;
  const isStaff = isShopAdminRole(auth.role) || isAgentRole(auth.role);
  if (!isOwner && !isStaff) return shopJson({ error: "Không có quyền." }, { status: 403 });

  if (listing.status === "reserved" && !isStaff) {
    return shopJson({ error: "Tin đang có đơn, không sửa được." }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  // Đẩy tin: đưa tin lên đầu danh sách "mới nhất". Mỗi tin chỉ đẩy được một lần
  // mỗi ngày, nếu không thì người bán nào chăm bấm nhất sẽ chiếm hết trang đầu.
  if (body.action === "bump") {
    if (!isOwner && !isStaff) return shopJson({ error: "Không có quyền." }, { status: 403 });
    if (listing.status !== "active") {
      return shopJson({ error: "Chỉ đẩy được tin đang bán." }, { status: 409 });
    }
    const last = listing.bumped_at ? Date.parse(listing.bumped_at) : 0;
    const waitMs = BUMP_COOLDOWN_MS - (Date.now() - last);
    if (!isStaff && waitMs > 0) {
      const hours = Math.ceil(waitMs / 3_600_000);
      return shopJson({ error: `Còn ${hours} giờ nữa mới đẩy tin tiếp được.` }, { status: 429 });
    }
    // Kiểm tra lỗi ghi: cột `bumped_at` chỉ có sau migration v2, mà báo "đã đẩy
    // tin" trong khi không có gì thay đổi thì tệ hơn là báo hỏng.
    const { error } = (await untypedFrom(db, "shop_listings")
      .update({ bumped_at: new Date().toISOString() } as never)
      .eq("id", id)) as { error: { message: string } | null };
    if (error) return shopJson({ error: error.message }, { status: 500 });
    return shopJson({ ok: true, bumped: true });
  }

  // Người bán xin đẩy nổi bật. Chỉ ghi một mốc thời gian vào hàng chờ — quyền
  // bật nhãn vẫn nằm ở nhân sự, người bán không tự làm tin mình nổi bật được.
  if (body.action === "feature_request") {
    if (!isOwner) return shopJson({ error: "Chỉ chủ tin xin được." }, { status: 403 });
    if (listing.status !== "active") {
      return shopJson({ error: "Chỉ xin được cho tin đang bán." }, { status: 409 });
    }
    if (listing.featured_until && Date.parse(listing.featured_until) > Date.now()) {
      return shopJson({ error: "Tin đang nổi bật rồi." }, { status: 409 });
    }
    if (listing.featured_requested_at) {
      return shopJson({ error: "Yêu cầu trước còn đang chờ duyệt." }, { status: 409 });
    }
    const { error } = (await untypedFrom(db, "shop_listings")
      .update({ featured_requested_at: new Date().toISOString() } as never)
      .eq("id", id)) as { error: { message: string } | null };
    if (error) return shopJson({ error: error.message }, { status: 500 });
    return shopJson({ ok: true, requested: true });
  }

  // Nhân sự từ chối yêu cầu: chỉ dọn hàng chờ, tin vẫn bán bình thường.
  if (body.action === "feature_reject") {
    if (!isStaff) return shopJson({ error: "Không có quyền." }, { status: 403 });
    const { error } = (await untypedFrom(db, "shop_listings")
      .update({ featured_requested_at: null } as never)
      .eq("id", id)) as { error: { message: string } | null };
    if (error) return shopJson({ error: error.message }, { status: 500 });
    if (listing.featured_requested_at) void notifyFeatureRejected(listing);
    return shopJson({ ok: true, requestCleared: true });
  }

  // Gắn/gỡ nhãn nổi bật — chỉ nhân sự. Duyệt xong thì dọn luôn hàng chờ, nếu
  // không yêu cầu đã xử lý vẫn nằm đó và admin sẽ duyệt lại lần nữa.
  if (body.action === "feature") {
    if (!isStaff) return shopJson({ error: "Không có quyền." }, { status: 403 });
    const days = Math.min(30, Math.max(0, Number(body.days ?? 7) || 0));
    const { error } = (await untypedFrom(db, "shop_listings")
      .update({
        featured_until: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
        featured_requested_at: null,
      } as never)
      .eq("id", id)) as { error: { message: string } | null };
    if (error) return shopJson({ error: error.message }, { status: 500 });
    if (days > 0) void notifyListingFeatured(listing, days);
    return shopJson({ ok: true, featuredDays: days });
  }

  if (typeof body.status === "string") {
    const next = body.status as ListingStatus;
    const allowed = isStaff ? STAFF_STATUSES : OWNER_STATUSES;
    if (!allowed.includes(next)) {
      return shopJson({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    patch.status = next;
    patch.reject_reason = next === "rejected" ? String(body.reason ?? "").slice(0, 300) : null;
  }

  if (isOwner) {
    if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 120);
    if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 4000);
    if (body.price != null && Number.isFinite(Number(body.price))) patch.price = Math.round(Number(body.price));
    if (Array.isArray(body.images)) {
      patch.images = (body.images as unknown[])
        .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
        .slice(0, 8);
    }
    // Sửa nội dung ⇒ về hàng chờ duyệt lại
    const touchedContent = ["title", "description", "price", "images"].some((k) => k in patch);
    if (touchedContent && patch.status == null) patch.status = "pending";
  }

  if (Object.keys(patch).length === 0) {
    return shopJson({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  const { error } = (await untypedFrom(db, "shop_listings")
    .update(patch as never)
    .eq("id", id)) as { error: { message: string } | null };
  if (error) return shopJson({ error: error.message }, { status: 500 });

  // Vừa được duyệt lên sàn: đăng ra kênh chợ Discord + đánh thức người theo dõi.
  if (patch.status === "active" && listing.status !== "active") {
    void notifyListingApproved({ ...listing, status: "active" });
  }
  if (patch.status === "rejected") {
    void notifyListingRejected(listing, String(patch.reject_reason ?? "Không nêu lý do"));
  }

  return shopJson({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return shopJson({ error: "Không tìm thấy tin." }, { status: 404 });

  const access = await accessForSeller(auth.userId, listing.seller_id);
  if (!access?.canManageListings && !isShopAdminRole(auth.role)) {
    return shopJson({ error: "Không có quyền." }, { status: 403 });
  }
  if (["reserved", "sold"].includes(listing.status)) {
    return shopJson({ error: "Tin đã phát sinh đơn — chỉ ẩn được." }, { status: 409 });
  }

  await untypedFrom(db, "shop_listings").delete().eq("id", id);
  return shopJson({ ok: true });
}
