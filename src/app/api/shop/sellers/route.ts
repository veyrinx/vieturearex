import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSellerByUser, isShopAdminRole, listSellers } from "@/lib/server/shop";
import { NO_STORE, ownSellerView, redactSellersForList } from "@/lib/server/shop-privacy";
import { isAllowedImageRef } from "@/lib/server/shop-files";

/** Hồ sơ xin làm người bán — nộp một lần, admin duyệt mới được đăng tin. */

const MAX = 200;
const str = (v: unknown, max = MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-sellers", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  // Admin xem toàn bộ hồ sơ, nhưng ở dạng đã che: STK và SĐT chỉ còn vài ký
  // tự, ảnh giấy tờ không đi kèm danh sách. Muốn xem đủ phải mở từng hồ sơ
  // qua GET /api/shop/sellers/[id]?reveal=1 và chịu ghi log.
  if (isShopAdminRole(auth.role)) {
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    return NextResponse.json(
      { sellers: redactSellersForList(await listSellers(status)) },
      { headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { seller: ownSellerView(await getSellerByUser(auth.userId)) },
    { headers: NO_STORE },
  );
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-seller-apply", limit: 5, windowMs: 600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const existing = await getSellerByUser(auth.userId);
  if (existing && existing.status !== "rejected") {
    return NextResponse.json({ error: "Bạn đã có hồ sơ người bán." }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = {
    user_id: auth.userId,
    display_name: str(body.displayName, 60),
    real_name: str(body.realName, 60),
    phone: str(body.phone, 20),
    contact: str(body.contact, 120),
    bank_name: str(body.bankName, 60),
    bank_account: str(body.bankAccount, 40),
    bank_holder: str(body.bankHolder, 60),
    id_images: Array.isArray(body.idImages)
      ? (body.idImages as unknown[]).filter(isAllowedImageRef).slice(0, 4)
      : [],
    note: str(body.note, 500) || null,
    status: "pending",
    reject_reason: null,
  };

  const missing = (["display_name", "real_name", "phone", "contact", "bank_name", "bank_account", "bank_holder"] as const)
    .filter((k) => !payload[k]);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Vui lòng điền đủ thông tin bắt buộc." }, { status: 400 });
  }

  // Nộp lại sau khi bị từ chối thì ghi đè hồ sơ cũ
  const { error } = (await untypedFrom(db, "shop_sellers").upsert(payload as never, {
    onConflict: "user_id",
  })) as { error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
