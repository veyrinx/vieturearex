import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPageContents, getPageBody } from "@/lib/server/page-content";

// Public — nội dung trang do admin đặt (admin sửa ở /admin/page-content).
// ?key=<trang> → chỉ trả body của 1 trang; không có key → tất cả trang đang bật.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "page-content", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const cache = { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" };
  const key = request.nextUrl.searchParams.get("key");

  if (key) {
    const body = await getPageBody(key);
    return NextResponse.json({ key, body }, { headers: cache });
  }

  const items = (await getPageContents())
    .filter((p) => p.enabled !== false)
    .map(({ key, body }) => ({ key, body }));
  return NextResponse.json({ items }, { headers: cache });
}
