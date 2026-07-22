import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPrimeItems } from "@/lib/server/store";

// Public — gói Prime của Arex đang bật (admin sửa ở /admin/prime).
// Khác /api/prime-store (cửa hàng LIVE trong game).
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "prime", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const items = (await getPrimeItems()).filter((i) => i.enabled !== false);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
