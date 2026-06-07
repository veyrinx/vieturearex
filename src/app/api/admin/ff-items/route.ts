import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

const JSDELIVR_INDEX = "https://data.jsdelivr.com/v1/packages/gh/ShahGCreator/icon@main?structure=flat";

type JsdelivrFile = { name: string; hash?: string; size?: number; time?: string };
type JsdelivrResp = { default?: string; files?: JsdelivrFile[] };

// In-memory cache for 1 hour
let cache: { ids: string[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-index", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  // Require admin
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = Date.now();
  if (!force && cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ids: cache.ids, cached: true, count: cache.ids.length });
  }

  try {
    const res = await fetch(JSDELIVR_INDEX, {
      headers: { Accept: "application/json" },
      // Server-side fetch; revalidate on demand
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Không thể tải danh sách", status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as JsdelivrResp;

    // Extract IDs from PNG file paths: /PNG/123456789.png
    const ids = new Set<string>();
    for (const f of data.files ?? []) {
      const m = f.name.match(/^\/?PNG\/([^/]+)\.png$/i);
      if (m && m[1]) ids.add(m[1]);
    }
    const sortedIds = [...ids].sort();

    cache = { ids: sortedIds, ts: now };
    return NextResponse.json({ ids: sortedIds, cached: false, count: sortedIds.length });
  } catch (err) {
    return NextResponse.json({ error: "Lỗi mạng", details: String(err) }, { status: 500 });
  }
}
