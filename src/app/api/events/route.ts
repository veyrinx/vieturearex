import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/data/content-service";
import { enforceRateLimit } from "@/lib/server/api-guard";
import type { EventStatus } from "@/lib/types/content";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "events",
    limit: 100,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as EventStatus | "all" | null) ?? undefined;
  const events = await getEvents({
    search,
    status,
  });

  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
