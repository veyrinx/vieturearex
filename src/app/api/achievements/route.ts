import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getCustomAchievements } from "@/lib/server/achievements";

// Public — danh sách loại huy hiệu tuỳ chỉnh (admin tạo). Huy hiệu mặc định đã
// có sẵn trong client qua ACHIEVEMENT_DEFS nên chỉ cần trả phần custom.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "achievements", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const items = await getCustomAchievements();
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
