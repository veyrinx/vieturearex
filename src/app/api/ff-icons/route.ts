import { NextRequest, NextResponse } from "next/server";
import { getAllIconIds, ICON_CDN } from "@/lib/data/ff-icons";
import { enforceRateLimit } from "@/lib/server/api-guard";

// Danh sách toàn bộ icon từ repo GitHub (cache trong getAllIconIds)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-icons-public", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const ids = await getAllIconIds();
  return NextResponse.json({ ids, baseUrl: ICON_CDN, count: ids.length });
}
