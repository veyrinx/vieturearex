import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/data/content-service";
import { enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "news",
    limit: 100,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as "published" | "draft" | "all" | null) ?? "published";
  // Opt-in lightweight list: `?content=0` drops the heavy article body from each row.
  // Default keeps the full payload so the documented public API stays backward-compatible.
  const includeContent = searchParams.get("content") !== "0";
  const news = await getNews(status, { includeContent });

  return NextResponse.json({ news });
}
