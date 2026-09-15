import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

// In-memory cache for 10 minutes
type CatalogRow = { id: string; label: string | null; category: string | null; ob: string | null; is_hot: boolean };
let cache: { items: CatalogRow[]; ts: number } | null = null;
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

  // Sort phụ theo created_at desc: không có cột này thì Postgres trả thứ tự
  // vật lý trên đĩa — item vừa được upsert (kể cả chỉ sửa nhãn) có thể trồi
  // lên trước item thật sự mới, khiến danh sách trông như đảo lộn ngẫu nhiên.
  const { data } = await untypedFrom(db, "ff_items_catalog")
    .select("id, label, category, ob, is_hot")
    .eq("is_public", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(5000) as { data: CatalogRow[] | null };

  const items = data ?? [];
  cache = { items, ts: now };

  return NextResponse.json({ items, count: items.length, cached: false });
}
