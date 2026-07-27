import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getCountdowns } from "@/lib/server/countdowns";

// Public — các mốc đếm ngược đang bật (admin sửa ở /admin/countdowns).
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "countdowns", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const items = (await getCountdowns()).filter((i) => i.enabled !== false);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
