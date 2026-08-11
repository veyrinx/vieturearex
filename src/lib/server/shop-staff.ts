import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { MAX_STAFF_PER_SHOP, type StaffStatus } from "@/lib/constants/shop";
import type {
  SellerAccess,
  ShopSeller,
  ShopStaff,
  ShopStaffMembership,
  ShopStaffRow,
} from "@/lib/types/shop";

/**
 * CTV của gian hàng — nhân sự do chính người bán mời về phụ việc.
 *
 * File này cố ý KHÔNG import `shop.ts`: chiều phụ thuộc là shop.ts → shop-staff.ts
 * (partyForOrder và getShopViewer cần biết ai là CTV), nên gọi ngược lại sẽ tạo
 * vòng lặp module. Vài truy vấn `shop_sellers` vì thế được viết lại ở đây.
 *
 * Nguyên tắc quyền: chủ shop luôn đủ quyền; CTV chỉ có phần chủ shop bật, và
 * chỉ khi dòng của họ đang `active`. Không chỗ nào trong chợ được tự so
 * `seller.user_id === userId` nữa — hỏi `sellerAccessFor()` / `accessForSeller()`.
 */

function db() {
  return createAdminSupabaseClient();
}

type PgError = { message: string; code?: string } | null;

/** 42P01 = undefined_table. Dấu hiệu chưa chạy migration-shop-staff.sql. */
function isMissingTable(error: PgError): boolean {
  return error?.code === "42P01";
}

let warnedMissingTable = false;

function warnMissingTable(): void {
  if (warnedMissingTable) return;
  warnedMissingTable = true;
  console.warn(
    "[shop] Chưa có bảng shop_staff — hãy chạy supabase/migration-shop-staff.sql. " +
      "Tạm coi như chưa gian hàng nào có CTV.",
  );
}

// ── Đọc ────────────────────────────────────────────────────────────────────
async function sellerById(id: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopSeller | null };
  return data;
}

async function sellerByUser(userId: string): Promise<ShopSeller | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as { data: ShopSeller | null };
  return data;
}

/** Một dòng CTV cụ thể. */
export async function getStaffRecord(
  sellerId: string,
  userId: string,
): Promise<ShopStaff | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_staff")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: ShopStaff | null; error: PgError };
  if (isMissingTable(error)) warnMissingTable();
  return data;
}

export async function getStaffById(id: string): Promise<ShopStaff | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = (await untypedFrom(client, "shop_staff")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: ShopStaff | null; error: PgError };
  if (isMissingTable(error)) warnMissingTable();
  return data;
}

async function rawStaffRows(
  filter: { sellerId?: string; userId?: string; statuses?: StaffStatus[] },
): Promise<ShopStaff[]> {
  const client = db();
  if (!client) return [];
  let q = untypedFrom(client, "shop_staff").select("*").order("created_at", { ascending: true });
  if (filter.sellerId) q = q.eq("seller_id", filter.sellerId);
  if (filter.userId) q = q.eq("user_id", filter.userId);
  if (filter.statuses?.length) q = q.in("status", filter.statuses);
  const { data, error } = (await q) as { data: ShopStaff[] | null; error: PgError };
  if (isMissingTable(error)) warnMissingTable();
  return data ?? [];
}

/** Bảng CTV của một gian hàng, kèm tên người được mời. Dòng đã gỡ vẫn giữ để đối chiếu. */
export async function listShopStaff(sellerId: string): Promise<ShopStaffRow[]> {
  const rows = await rawStaffRows({ sellerId });
  if (rows.length === 0) return [];

  const client = db();
  if (!client) return rows.map((r) => ({ ...r, member: null }));

  const { data } = (await untypedFrom(client, "users")
    .select("id, display_name, handle, avatar_url")
    .in("id", [...new Set(rows.map((r) => r.user_id))])) as {
    data: { id: string; display_name: string | null; handle: string | null; avatar_url: string | null }[] | null;
  };
  const map = new Map((data ?? []).map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = map.get(r.user_id);
    return {
      ...r,
      member: u
        ? {
            display_name: u.display_name ?? "Thành viên Arex",
            handle: u.handle,
            avatar_url: u.avatar_url,
          }
        : null,
    };
  });
}

/** Lời mời + chỗ làm của chính người đang xem. */
export async function listStaffMemberships(
  userId: string,
  statuses: StaffStatus[] = ["invited", "active"],
): Promise<ShopStaffMembership[]> {
  const rows = await rawStaffRows({ userId, statuses });
  if (rows.length === 0) return [];

  const client = db();
  if (!client) return rows.map((r) => ({ ...r, shop: null }));

  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("id, display_name, status")
    .in("id", [...new Set(rows.map((r) => r.seller_id))])) as {
    data: { id: string; display_name: string; status: ShopSeller["status"] }[] | null;
  };
  const map = new Map((data ?? []).map((s) => [s.id, s]));
  return rows.map((r) => ({ ...r, shop: map.get(r.seller_id) ?? null }));
}

/** Số CTV đang giữ chỗ (đang làm hoặc chưa trả lời lời mời). */
export async function countActiveStaff(sellerId: string): Promise<number> {
  const rows = await rawStaffRows({ sellerId, statuses: ["invited", "active"] });
  return rows.length;
}

// ── Quyền ──────────────────────────────────────────────────────────────────
function ownerAccess(seller: ShopSeller): SellerAccess {
  return {
    seller,
    isOwner: true,
    staffId: null,
    canManageListings: true,
    canHandleOrders: true,
  };
}

function staffAccess(seller: ShopSeller, staff: ShopStaff): SellerAccess {
  return {
    seller,
    isOwner: false,
    staffId: staff.id,
    canManageListings: staff.can_manage_listings,
    canHandleOrders: staff.can_handle_orders,
  };
}

/**
 * Quyền của `userId` trên gian hàng `sellerId`. `null` = không dính dáng gì.
 *
 * Không lọc theo trạng thái gian hàng ở đây: shop bị tạm khoá thì chủ và CTV
 * vẫn vào xem được tin/đơn cũ, chỗ nào cần "shop phải đang hoạt động" thì tự
 * kiểm tra `access.seller.status === "approved"`.
 */
export async function accessForSeller(
  userId: string | null,
  sellerId: string,
): Promise<SellerAccess | null> {
  if (!userId) return null;
  const seller = await sellerById(sellerId);
  if (!seller) return null;
  if (seller.user_id === userId) return ownerAccess(seller);
  const staff = await getStaffRecord(sellerId, userId);
  if (!staff || staff.status !== "active") return null;
  return staffAccess(seller, staff);
}

/**
 * Mọi gian hàng người này làm việc được: shop của chính mình trước, rồi tới các
 * shop đang làm CTV. Danh sách rỗng = không phải người bán, cũng không phải CTV.
 */
export async function listAccessibleShops(userId: string | null): Promise<SellerAccess[]> {
  if (!userId) return [];

  const [own, staffRows] = await Promise.all([
    sellerByUser(userId),
    rawStaffRows({ userId, statuses: ["active"] }),
  ]);

  const out: SellerAccess[] = own ? [ownerAccess(own)] : [];
  if (staffRows.length === 0) return out;

  const client = db();
  if (!client) return out;
  const { data } = (await untypedFrom(client, "shop_sellers")
    .select("*")
    .in("id", staffRows.map((r) => r.seller_id))) as { data: ShopSeller[] | null };
  const map = new Map((data ?? []).map((s) => [s.id, s]));

  for (const row of staffRows) {
    const seller = map.get(row.seller_id);
    // Bỏ shop đã bị xoá hoặc bị từ chối hồ sơ — CTV vào cũng không làm được gì.
    if (!seller || seller.status === "rejected") continue;
    out.push(staffAccess(seller, row));
  }
  return out;
}

/** Các gian hàng người này được đụng vào đơn — dùng cho tab "Tôi bán". */
export async function sellerIdsForOrders(userId: string | null): Promise<string[]> {
  const shops = await listAccessibleShops(userId);
  return shops.filter((s) => s.canHandleOrders).map((s) => s.seller.id);
}

/** Người cần nhận thông báo thay mặt gian hàng: chủ shop + CTV xử lý đơn. */
export async function shopSideUserIds(sellerId: string): Promise<string[]> {
  const [seller, staffRows] = await Promise.all([
    sellerById(sellerId),
    rawStaffRows({ sellerId, statuses: ["active"] }),
  ]);
  const ids = new Set<string>();
  if (seller?.user_id) ids.add(seller.user_id);
  for (const row of staffRows) if (row.can_handle_orders) ids.add(row.user_id);
  return [...ids];
}

// ── Ghi ────────────────────────────────────────────────────────────────────
export type StaffMutation =
  | { ok: true; staff: ShopStaff }
  | { ok: false; error: string; code: number };

/** Tìm người được mời theo handle (@abc) hoặc email. */
export async function findMemberToInvite(
  query: string,
): Promise<{ id: string; display_name: string | null } | null> {
  const client = db();
  if (!client) return null;
  const q = query.trim().replace(/^@/, "").toLowerCase();
  if (!q) return null;

  const column = q.includes("@") ? "email" : "handle";
  const { data } = (await untypedFrom(client, "users")
    .select("id, display_name, is_banned")
    .eq(column, q)
    .maybeSingle()) as { data: { id: string; display_name: string | null; is_banned: boolean } | null };
  if (!data || data.is_banned) return null;
  return { id: data.id, display_name: data.display_name };
}

/**
 * Mời một thành viên làm CTV. Ghi đè được dòng cũ đã từ chối / đã gỡ, nhưng
 * không ghi đè dòng đang chờ trả lời hay đang làm.
 */
export async function inviteStaff(input: {
  sellerId: string;
  userId: string;
  invitedBy: string;
  canManageListings: boolean;
  canHandleOrders: boolean;
  note?: string | null;
}): Promise<StaffMutation> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const seller = await sellerById(input.sellerId);
  if (!seller) return { ok: false, error: "Không tìm thấy gian hàng.", code: 404 };
  if (seller.user_id === input.userId) {
    return { ok: false, error: "Chủ gian hàng không cần mời chính mình.", code: 400 };
  }
  if (!input.canManageListings && !input.canHandleOrders) {
    return { ok: false, error: "Chọn ít nhất một nhóm việc cho CTV.", code: 400 };
  }

  const existing = await getStaffRecord(input.sellerId, input.userId);
  if (existing && ["invited", "active"].includes(existing.status)) {
    return {
      ok: false,
      error: existing.status === "active" ? "Người này đang là CTV của shop." : "Lời mời trước còn đang chờ trả lời.",
      code: 409,
    };
  }
  if (!existing && (await countActiveStaff(input.sellerId)) >= MAX_STAFF_PER_SHOP) {
    return { ok: false, error: `Mỗi gian hàng tối đa ${MAX_STAFF_PER_SHOP} CTV.`, code: 409 };
  }

  const patch = {
    seller_id: input.sellerId,
    user_id: input.userId,
    invited_by: input.invitedBy,
    can_manage_listings: input.canManageListings,
    can_handle_orders: input.canHandleOrders,
    status: "invited" as StaffStatus,
    note: input.note?.slice(0, 200) ?? null,
    accepted_at: null,
    revoked_at: null,
  };

  const query = existing
    ? untypedFrom(client, "shop_staff").update(patch as never).eq("id", existing.id)
    : untypedFrom(client, "shop_staff").insert(patch as never);

  const { data, error } = (await query.select("*").maybeSingle()) as {
    data: ShopStaff | null;
    error: PgError;
  };
  if (isMissingTable(error)) {
    warnMissingTable();
    return { ok: false, error: "Chức năng CTV chưa được bật (thiếu bảng shop_staff).", code: 503 };
  }
  if (error || !data) return { ok: false, error: error?.message ?? "Không mời được.", code: 500 };
  return { ok: true, staff: data };
}

/** Người được mời bấm đồng ý / từ chối. */
export async function respondToInvite(input: {
  staffId: string;
  userId: string;
  accept: boolean;
}): Promise<StaffMutation> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const staff = await getStaffById(input.staffId);
  if (!staff) return { ok: false, error: "Không tìm thấy lời mời.", code: 404 };
  if (staff.user_id !== input.userId) {
    return { ok: false, error: "Lời mời này không phải của bạn.", code: 403 };
  }
  if (staff.status !== "invited") {
    return { ok: false, error: "Lời mời đã được trả lời rồi.", code: 409 };
  }

  const { data, error } = (await untypedFrom(client, "shop_staff")
    .update({
      status: input.accept ? "active" : "declined",
      accepted_at: input.accept ? new Date().toISOString() : null,
    } as never)
    .eq("id", staff.id)
    .eq("status", "invited")
    .select("*")
    .maybeSingle()) as { data: ShopStaff | null; error: PgError };
  if (error || !data) return { ok: false, error: error?.message ?? "Không cập nhật được.", code: 500 };
  return { ok: true, staff: data };
}

/** Chủ shop đổi nhóm việc của một CTV. */
export async function updateStaffPermissions(input: {
  staffId: string;
  canManageListings: boolean;
  canHandleOrders: boolean;
}): Promise<StaffMutation> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };
  if (!input.canManageListings && !input.canHandleOrders) {
    return { ok: false, error: "Chọn ít nhất một nhóm việc, hoặc gỡ hẳn CTV.", code: 400 };
  }

  const { data, error } = (await untypedFrom(client, "shop_staff")
    .update({
      can_manage_listings: input.canManageListings,
      can_handle_orders: input.canHandleOrders,
    } as never)
    .eq("id", input.staffId)
    .select("*")
    .maybeSingle()) as { data: ShopStaff | null; error: PgError };
  if (error || !data) return { ok: false, error: error?.message ?? "Không cập nhật được.", code: 500 };
  return { ok: true, staff: data };
}

/** Gỡ CTV (chủ shop gỡ, hoặc CTV tự nghỉ). Giữ dòng lại để còn đối chiếu. */
export async function revokeStaff(staffId: string): Promise<StaffMutation> {
  const client = db();
  if (!client) return { ok: false, error: "Chưa cấu hình Supabase.", code: 500 };

  const { data, error } = (await untypedFrom(client, "shop_staff")
    .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
    .eq("id", staffId)
    .select("*")
    .maybeSingle()) as { data: ShopStaff | null; error: PgError };
  if (error || !data) return { ok: false, error: error?.message ?? "Không gỡ được.", code: 500 };
  return { ok: true, staff: data };
}

/** Xoá hẳn một dòng — chỉ dùng cho lời mời chưa ai trả lời. */
export async function deleteStaffRow(staffId: string): Promise<void> {
  const client = db();
  if (!client) return;
  await untypedFrom(client, "shop_staff").delete().eq("id", staffId);
}
