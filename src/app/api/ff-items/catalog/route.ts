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
  // Phân trang 1000/lượt (trần max-rows của PostgREST): file JSON kho đầy đủ
  // nạp ~3 vạn dòng, cắt ở 5000 thì OB của phần lớn item không tới được /items
  // và đồ mới ra không được ghim.
  const PAGE = 1000;
  const MAX_ROWS = 60_000;
  const items: CatalogRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await untypedFrom(db, "ff_items_catalog")
      .select("id, label, category, ob, is_hot")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1) as { data: CatalogRow[] | null; error: unknown };
    if (error || !data) break;
    items.push(...data);
    if (data.length < PAGE) break;
  }
  cache = { items, ts: now };

  return NextResponse.json({ items, count: items.length, cached: false });
}
