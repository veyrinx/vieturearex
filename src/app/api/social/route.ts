import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getSocialVideos } from "@/lib/server/social";

// Public — video mạng xã hội đang bật (admin sửa ở /admin/social).
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "social", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const items = (await getSocialVideos()).filter((i) => i.enabled !== false);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
