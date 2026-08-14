import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { isShopAdminRole } from "@/lib/server/shop";
import { accessForSeller } from "@/lib/server/shop-staff";
import { shopJson } from "@/lib/server/shop-privacy";
import {
  MAX_DISCOUNT_PERCENT,
  MAX_SALE_DAYS,
  MIN_DISCOUNT_PERCENT,
  priceAfterPercent,
} from "@/lib/constants/shop";

/**
 * Giảm giá cả gian hàng một lượt.
 *
 * Không có cột "phần trăm giảm" trên `shop_sellers`: đợt giảm được ghi thẳng
 * vào `sale_price` của từng tin. Một nguồn sự thật duy nhất cho giá — trang
 * chợ, trang tin và lúc tạo đơn đều đọc cùng chỗ, không ai phải nhớ nhân thêm
 * một hệ số nào nữa.
 *
 * Chỉ đụng vào tin `active`: tin chờ duyệt có thể còn bị sửa giá lúc xét, tin
 * đã bán/đang giao dịch thì giá đã chốt trong đơn rồi.
 */

type ListingRow = { id: string; price: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, { name: "shop-sale-bulk", limit: 20, windowMs: 600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  // CTV được bật quyền quản lý tin cũng chạy được đợt giảm — đây là việc bán
  // hàng, không phải việc đụng vào hồ sơ hay tiền bạc của gian hàng.
  const access = await accessForSeller(auth.userId, id);
  if (!access?.canManageListings && !isShopAdminRole(auth.role)) {
    return shopJson({ error: "Không có quyền." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // ── Tắt đợt giảm ─────────────────────────────────────────────────────────
  if (body.clear === true) {
    const { error } = (await untypedFrom(db, "shop_listings")
      .update({ sale_price: null, sale_until: null } as never)
      .eq("seller_id", id)
      .not("sale_price", "is", null)) as { error: { message: string; code?: string } | null };
    if (error?.code === "42703") return migrationNeeded();
    if (error) return shopJson({ error: error.message }, { status: 500 });
    return shopJson({ ok: true, cleared: true });
  }

  const percent = Math.round(Number(body.percent));
  if (!Number.isFinite(percent) || percent < MIN_DISCOUNT_PERCENT || percent > MAX_DISCOUNT_PERCENT) {
    return shopJson(
      { error: `Mức giảm phải trong khoảng ${MIN_DISCOUNT_PERCENT}–${MAX_DISCOUNT_PERCENT}%.` },
      { status: 400 },
    );
  }
  const days = Math.min(MAX_SALE_DAYS, Math.max(0, Number(body.days ?? 0) || 0));
  const saleUntil = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;

  const { data, error: readError } = (await untypedFrom(db, "shop_listings")
    .select("id, price")
    .eq("seller_id", id)
    .eq("status", "active")
    .limit(200)) as { data: ListingRow[] | null; error: { message: string } | null };
  if (readError) return shopJson({ error: readError.message }, { status: 500 });

  const rows = data ?? [];
  if (rows.length === 0) {
    return shopJson({ error: "Gian hàng chưa có tin nào đang bán." }, { status: 409 });
  }

  // Mỗi tin một giá riêng nên phải ghi từng dòng — PostgREST không nhận biểu
  // thức tính từ chính cột `price`. 200 tin là trần, đủ cho shop lớn nhất.
  const results = await Promise.all(
    rows.map((row) =>
      untypedFrom(db, "shop_listings")
        .update({ sale_price: priceAfterPercent(row.price, percent), sale_until: saleUntil } as never)
        .eq("id", row.id) as unknown as Promise<{ error: { message: string; code?: string } | null }>,
    ),
  );

  const failed = results.filter((r) => r.error);
  if (failed.length === rows.length) {
    if (failed[0].error?.code === "42703") return migrationNeeded();
    return shopJson({ error: failed[0].error?.message ?? "Không đặt được giảm giá." }, { status: 500 });
  }

  return shopJson({ ok: true, updated: rows.length - failed.length, failed: failed.length, percent });
}

function migrationNeeded() {
  return shopJson(
    { error: "Chưa bật tính năng giảm giá — cần chạy supabase/migration-shop-sale.sql." },
    { status: 503 },
  );
}
