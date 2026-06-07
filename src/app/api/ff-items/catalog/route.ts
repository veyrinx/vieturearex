import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

// In-memory cache for 10 minutes
let cache: { items: Array<{ id: string; label: string | null; category: string | null }>; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// Public — returns only is_public catalog entries (no admin auth needed)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "catalog-public", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json({ items: cache.items, count: cache.items.length, cached: true });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const { data } = await untypedFrom(db, "ff_items_catalog")
    .select("id, label, category")
    .eq("is_public", true)
    .order("category", { ascending: true })
    .limit(5000) as { data: Array<{ id: string; label: string | null; category: string | null }> | null };

  const items = data ?? [];
  cache = { items, ts: now };

  return NextResponse.json({ items, count: items.length, cached: false });
}
