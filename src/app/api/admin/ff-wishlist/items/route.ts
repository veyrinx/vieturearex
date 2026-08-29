import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { searchItems } from "@/lib/server/ff-wishlist";

/**
 * Tìm vật phẩm để gắn — gõ ID ra đúng ID đó, gõ chữ thì lọc theo tên.
 *
 * Kho tên nằm ở máy chủ (nhớ 1 giờ), client chỉ nhận vài chục dòng khớp: không
 * kéo cả kho ba mươi nghìn món về trình duyệt mỗi lần mở công cụ.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wishlist-items", limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ capability: "wishlist.view" });
  if (denied) return denied;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const items = await searchItems(q);
  return NextResponse.json({ items }, { headers: { "cache-control": "private, max-age=30" } });
}
