import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";

const BUCKET = "ff-items";

// In-memory cache for 10 minutes
let cache: { ids: string[]; baseUrl: string | null; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-public", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ids: cache.ids, baseUrl: cache.baseUrl, count: cache.ids.length, cached: true });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ids: [], baseUrl: null });

  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    return NextResponse.json({ ids: [], baseUrl: null, bucketMissing: true });
  }

  const ids: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; offset < 10; offset++) {
    const { data, error } = await db.storage.from(BUCKET).list("", {
      limit: PAGE,
      offset: offset * PAGE,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) break;
    for (const file of data) {
      const m = file.name.match(/^(.+)\.png$/i);
      if (m && m[1]) ids.push(m[1]);
    }
    if (data.length < PAGE) break;
  }

  const sample = ids[0] ?? "";
  const baseUrl = sample
    ? db.storage.from(BUCKET).getPublicUrl(`${sample}.png`).data.publicUrl.replace(`${sample}.png`, "")
    : null;

  cache = { ids, baseUrl, ts: now };
  return NextResponse.json({ ids, baseUrl, count: ids.length, cached: false });
}
