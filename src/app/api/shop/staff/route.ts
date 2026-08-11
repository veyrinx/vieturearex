import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getSellerById, getSellerByUser, isShopAdminRole } from "@/lib/server/shop";
import {
  deleteStaffRow,
  findMemberToInvite,
  getStaffById,
  inviteStaff,
  listShopStaff,
  listStaffMemberships,
  respondToInvite,
  revokeStaff,
  updateStaffPermissions,
} from "@/lib/server/shop-staff";
import { notifyStaffInvite, notifyStaffInviteAnswered, notifyStaffRevoked } from "@/lib/server/shop-notify";
import { shopJson } from "@/lib/server/shop-privacy";
import type { ShopSeller } from "@/lib/types/shop";

/**
 * CTV của gian hàng.
 *
 * Ai được đụng vào bảng này: CHỦ gian hàng (mời, đổi quyền, gỡ) và người được
 * mời (đồng ý, từ chối, tự nghỉ). CTV không mời được CTV khác — nếu không thì
 * một lần mời nhầm là mất kiểm soát cả gian hàng.
 */

/** Gian hàng mà người này làm chủ, kèm quyền admin sàn thay mặt chủ. */
async function ownedShop(
  userId: string,
  role: string,
  sellerId: string | null,
): Promise<ShopSeller | null> {
  const own = await getSellerByUser(userId);
  if (own && (!sellerId || own.id === sellerId)) return own;
  // Admin sàn xử lý hộ khi người bán nhờ — vẫn phải nói rõ gian hàng nào.
  if (sellerId && isShopAdminRole(role)) return getSellerById(sellerId);
  return null;
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-staff", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const sellerId = new URL(req.url).searchParams.get("sellerId");

  // Bảng CTV của một gian hàng — chỉ chủ shop (hoặc admin sàn) xem được.
  if (sellerId) {
    const shop = await ownedShop(auth.userId, auth.role, sellerId);
    if (!shop) return shopJson({ error: "Không có quyền." }, { status: 403 });
    return shopJson({ staff: await listShopStaff(shop.id), sellerId: shop.id });
  }

  // Mặc định: chỗ làm và lời mời của chính mình.
  const memberships = await listStaffMemberships(auth.userId, ["invited", "active"]);
  return shopJson({
    invites: memberships.filter((m) => m.status === "invited"),
    memberships: memberships.filter((m) => m.status === "active"),
  });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-staff-invite", limit: 20, windowMs: 3_600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sellerId = typeof body.sellerId === "string" ? body.sellerId : null;

  const shop = await ownedShop(auth.userId, auth.role, sellerId);
  if (!shop) return shopJson({ error: "Chỉ chủ gian hàng mới mời được CTV." }, { status: 403 });
  if (shop.status !== "approved") {
    return shopJson({ error: "Hồ sơ bán được duyệt rồi mới mời CTV được." }, { status: 403 });
  }

  const query = typeof body.member === "string" ? body.member.trim().slice(0, 120) : "";
  if (!query) return shopJson({ error: "Nhập @handle hoặc email của người cần mời." }, { status: 400 });

  const member = await findMemberToInvite(query);
  if (!member) {
    return shopJson(
      { error: "Không tìm thấy thành viên nào khớp. Hãy hỏi họ email đăng ký hoặc @handle." },
      { status: 404 },
    );
  }

  const result = await inviteStaff({
    sellerId: shop.id,
    userId: member.id,
    invitedBy: auth.userId,
    canManageListings: body.canManageListings !== false,
    canHandleOrders: body.canHandleOrders === true,
    note: typeof body.note === "string" ? body.note : null,
  });
  if (!result.ok) return shopJson({ error: result.error }, { status: result.code });

  void notifyStaffInvite(result.staff, shop);
  return shopJson({ ok: true, staff: result.staff }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-staff-edit", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "";

  const staff = id ? await getStaffById(id) : null;
  if (!staff) return shopJson({ error: "Không tìm thấy dòng CTV." }, { status: 404 });

  const isMember = staff.user_id === auth.userId;
  const shop = await ownedShop(auth.userId, auth.role, staff.seller_id);

  // Người được mời trả lời
  if (action === "accept" || action === "decline") {
    if (!isMember) return shopJson({ error: "Lời mời này không phải của bạn." }, { status: 403 });
    const r = await respondToInvite({ staffId: staff.id, userId: auth.userId, accept: action === "accept" });
    if (!r.ok) return shopJson({ error: r.error }, { status: r.code });
    void notifyStaffInviteAnswered(r.staff, action === "accept");
    return shopJson({ ok: true, staff: r.staff });
  }

  // Chủ shop đổi nhóm việc
  if (action === "perms") {
    if (!shop) return shopJson({ error: "Không có quyền." }, { status: 403 });
    const r = await updateStaffPermissions({
      staffId: staff.id,
      canManageListings: body.canManageListings === true,
      canHandleOrders: body.canHandleOrders === true,
    });
    return r.ok ? shopJson({ ok: true, staff: r.staff }) : shopJson({ error: r.error }, { status: r.code });
  }

  // Gỡ CTV: chủ shop gỡ, hoặc chính CTV tự nghỉ
  if (action === "revoke") {
    if (!shop && !isMember) return shopJson({ error: "Không có quyền." }, { status: 403 });
    if (staff.status === "revoked") return shopJson({ ok: true, staff });
    const r = await revokeStaff(staff.id);
    if (!r.ok) return shopJson({ error: r.error }, { status: r.code });
    void notifyStaffRevoked(r.staff, { bySelf: isMember && !shop });
    return shopJson({ ok: true, staff: r.staff });
  }

  return shopJson({ error: "Thao tác không hợp lệ." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  const staff = id ? await getStaffById(id) : null;
  if (!staff) return shopJson({ error: "Không tìm thấy dòng CTV." }, { status: 404 });

  const shop = await ownedShop(auth.userId, auth.role, staff.seller_id);
  if (!shop) return shopJson({ error: "Không có quyền." }, { status: 403 });
  // Đang làm thì phải gỡ (giữ lại lịch sử), chỉ dọn hẳn dòng chưa/không thành CTV.
  if (staff.status === "active") {
    return shopJson({ error: "Hãy gỡ CTV trước khi xoá khỏi danh sách." }, { status: 409 });
  }

  await deleteStaffRow(staff.id);
  return shopJson({ ok: true });
}
