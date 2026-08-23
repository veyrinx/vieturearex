import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPriceStats } from "@/lib/server/shop-price";
import { getPlayerAllData, isFfApiConfigured, normalizePlayerUid } from "@/lib/server/ff-api";
import type { ListingKind } from "@/lib/constants/shop";

export const runtime = "nodejs";

/**
 * GET /api/shop/price-stats?kind=account&level=45
 * GET /api/shop/price-stats?uid=123456789   (tự tra level từ API Free Fire)
 *
 * Trả khoảng giá của những acc tương tự, tính từ đơn ĐÃ HOÀN TẤT trong chợ.
 * Không trả giá của từng đơn — chỉ số liệu đã gộp, nên không lộ ai bán bao nhiêu.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "price-stats", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const kind: ListingKind = params.get("kind") === "item" ? "item" : "account";

  let level: number | null = null;
  const rawLevel = params.get("level");
  if (rawLevel) {
    const n = Number(rawLevel);
    if (Number.isFinite(n) && n > 0) level = Math.round(n);
  }

  // Không truyền level nhưng có UID thì tự tra — người bán chỉ cần dán UID.
  const uid = normalizePlayerUid(params.get("uid") ?? "");
  if (level === null && uid && isFfApiConfigured()) {
    const res = await getPlayerAllData(uid).catch(() => null);
    const info = res?.result?.AccountInfo as Record<string, unknown> | undefined;
    const n = Number(info?.AccountLevel);
    if (Number.isFinite(n) && n > 0) level = Math.round(n);
  }

  const stats = await getPriceStats({ kind, level });

  return NextResponse.json(
    { kind, level, ...stats },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
  );
}
