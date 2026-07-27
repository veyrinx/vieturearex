import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPartners } from "@/lib/server/partners";
import { isPartnerLive } from "@/lib/constants/partners";

// Public — đối tác đang hiển thị (bật + chưa hết hạn hợp tác). Admin sửa ở /admin/partners.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "partners", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const items = (await getPartners()).filter((p) => isPartnerLive(p));
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
