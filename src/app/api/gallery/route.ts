import { NextRequest, NextResponse } from "next/server";
import { getGalleryItems } from "@/lib/data/content-service";
import { enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "gallery",
    limit: 80,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const gallery = await getGalleryItems();
  return NextResponse.json({ gallery });
}
