import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getStreams } from "@/lib/server/stream-service";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "streams", limit: 100, windowMs: 60_000 });
  if (limited) return limited;
  const streams = await getStreams();
  return NextResponse.json({ streams });
}
