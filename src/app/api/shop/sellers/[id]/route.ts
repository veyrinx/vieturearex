import { NextRequest } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSellerById, isShopAdminRole } from "@/lib/server/shop";
import { logSensitiveAccess, shopJson } from "@/lib/server/shop-privacy";
import type { SellerStatus } from "@/lib/constants/shop";

/** Admin duyệt / từ chối / khoá hồ sơ người bán. Duyệt xong cấp luôn role `seller`. */

const ALLOWED: SellerStatus[] = ["pending", "approved", "rejected", "suspended"];

/**
 * Mở đủ một hồ sơ để duyệt: số tài khoản thật và ảnh giấy tờ.
 *
 * Tách khỏi danh sách có chủ đích — admin phải chủ động mở từng hồ sơ, và mỗi
 * lần mở là một dòng trong `shop_access_logs`. Nếu sau này có chuyện lộ CCCD
 * của người bán thì còn tra được ai đã xem, lúc nào.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-seller-reveal", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) {
    return shopJson({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller) {
    return shopJson({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  await logSensitiveAccess({
    actorId: auth.userId,
    actorRole: auth.role,
    kind: "seller_documents",
    target: `${seller.id} (${seller.display_name})`,
    ip: getClientIp(req),
  });

  return shopJson({ seller });
}

/**
 * Sửa hồ sơ gian hàng.
 *
 * Hai nhánh tách bạch:
 * - `status` → admin duyệt/khoá hồ sơ (nhánh cũ).
 * - còn lại  → chủ shop (hoặc admin) sửa thông tin gian hàng.
 *
 * Chủ shop KHÔNG sửa được `real_name` và ảnh giấy tờ: đó là phần đã đối chiếu
 * lúc duyệt, đổi được thì việc xác minh thành vô nghĩa. Đổi tên thật phải nhờ
 * admin. Đổi số tài khoản thì sửa được, nhưng để lại một dòng nhật ký — tiền
 * của mọi đơn sau đó chảy về đấy.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-seller-review", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller) return shopJson({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const isAdmin = isShopAdminRole(auth.role);

  if (body.status == null) {
    return patchProfile({ req, body, seller, auth: { userId: auth.userId, role: auth.role }, isAdmin });
  }

  if (!isAdmin) return shopJson({ error: "Không có quyền." }, { status: 403 });

  const status = body.status as SellerStatus | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return shopJson({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = (await untypedFrom(db, "shop_sellers")
    .update({
      status,
      reject_reason:
        status === "rejected" || status === "suspended"
          ? String(body.reason ?? "").slice(0, 300)
          : null,
      approved_at: status === "approved" ? now : seller.approved_at,
      approved_by: status === "approved" ? auth.userId : null,
    } as never)
    .eq("id", id)) as { error: { message: string } | null };
  if (error) return shopJson({ error: error.message }, { status: 500 });

  // Gắn/gỡ role `seller` — không đụng vào ai đang là nhân sự của site
  const { data: profile } = (await untypedFrom(db, "users")
    .select("role")
    .eq("id", seller.user_id)
    .maybeSingle()) as { data: { role: string } | null };

  if (status === "approved" && profile?.role === "user") {
    await untypedFrom(db, "users").update({ role: "seller" } as never).eq("id", seller.user_id);
  }
  if (status !== "approved" && profile?.role === "seller") {
    await untypedFrom(db, "users").update({ role: "user" } as never).eq("id", seller.user_id);
  }

  return shopJson({ ok: true, status });
}

/** Các trường chủ shop tự sửa được, kèm độ dài tối đa. */
const PROFILE_FIELDS: { key: string; column: string; max: number }[] = [
  { key: "displayName", column: "display_name", max: 60 },
  { key: "phone", column: "phone", max: 20 },
  { key: "contact", column: "contact", max: 120 },
  { key: "bankName", column: "bank_name", max: 60 },
  { key: "bankAccount", column: "bank_account", max: 40 },
  { key: "bankHolder", column: "bank_holder", max: 60 },
  { key: "bio", column: "bio", max: 600 },
  { key: "note", column: "note", max: 500 },
];

/** Đổi cột này là đổi nơi tiền đơn hàng chảy về ⇒ phải ghi nhật ký. */
const BANK_COLUMNS = new Set(["bank_name", "bank_account", "bank_holder"]);

async function patchProfile(input: {
  req: NextRequest;
  body: Record<string, unknown>;
  seller: Awaited<ReturnType<typeof getSellerById>>;
  auth: { userId: string; role: string };
  isAdmin: boolean;
}) {
  const { req, body, seller, auth, isAdmin } = input;
  if (!seller) return shopJson({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  // CTV không sửa hồ sơ gian hàng: họ phụ bán hàng, không phải người đứng tên
  // giấy tờ và tài khoản ngân hàng.
  const isOwner = seller.user_id === auth.userId;
  if (!isOwner && !isAdmin) return shopJson({ error: "Không có quyền." }, { status: 403 });

  const patch: Record<string, unknown> = {};
  for (const f of PROFILE_FIELDS) {
    const raw = body[f.key];
    if (typeof raw !== "string") continue;
    const value = raw.trim().slice(0, f.max);
    // Trường bắt buộc thì không cho xoá trắng; hai trường trang trí thì được.
    if (!value && !["bio", "note"].includes(f.column)) {
      return shopJson({ error: "Thông tin bắt buộc không được để trống." }, { status: 400 });
    }
    if (value !== ((seller as Record<string, unknown>)[f.column] ?? "")) {
      patch[f.column] = value || null;
    }
  }

  if (typeof body.avatarUrl === "string") {
    const url = body.avatarUrl.trim();
    patch.avatar_url = url.startsWith("http") ? url.slice(0, 500) : null;
  }
  // Tên thật gắn với ảnh giấy tờ đã đối chiếu — chỉ admin sửa được.
  if (isAdmin && typeof body.realName === "string" && body.realName.trim()) {
    patch.real_name = body.realName.trim().slice(0, 60);
  }

  if (Object.keys(patch).length === 0) {
    return shopJson({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  const { error } = (await untypedFrom(db, "shop_sellers")
    .update(patch as never)
    .eq("id", seller.id)) as { error: { message: string; code?: string } | null };
  if (error?.code === "42703") {
    return shopJson(
      { error: "Chưa bật phần giới thiệu gian hàng — cần chạy supabase/migration-shop-sale.sql." },
      { status: 503 },
    );
  }
  if (error) return shopJson({ error: error.message }, { status: 500 });

  const touchedBank = Object.keys(patch).filter((c) => BANK_COLUMNS.has(c));
  if (touchedBank.length > 0) {
    await logSensitiveAccess({
      actorId: auth.userId,
      actorRole: auth.role,
      kind: "seller_profile_edit",
      target: `${seller.id} (${seller.display_name}) đổi ${touchedBank.join(", ")}`,
      ip: getClientIp(req),
    });
  }

  return shopJson({ ok: true, updated: Object.keys(patch) });
}
