import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPrimeStoreLive } from "@/lib/server/prime-store-live";
import { DEFAULT_PRIME_SERVER, isPrimeServer } from "@/lib/constants/prime-store-live";

export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "prime-store", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const raw = request.nextUrl.searchParams.get("server");
  const server = isPrimeServer(raw) ? raw : DEFAULT_PRIME_SERVER;

  const data = await getPrimeStoreLive(server);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
