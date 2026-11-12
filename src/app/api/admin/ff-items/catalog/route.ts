import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

const VALID_CATEGORIES = [
  "weapon", "character", "pet", "outfit", "skin",
  "accessory", "emote", "vehicle", "other",
] as const;

const upsertSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(80).regex(/^[\w.-]+$/),
    label: z.string().max(80).optional().nullable(),
    category: z.enum(VALID_CATEGORIES).optional().nullable(),
    ob: z.string().max(20).optional().nullable(),
    is_hot: z.boolean().optional(),
    is_public: z.boolean().optional(),
  })).min(1).max(200),
  // true → chỉ thêm mới, bỏ qua item đã tồn tại (dùng cho bulk push từ Library,
  // tránh ghi đè label/category/is_public đã curate).
  ignoreDuplicates: z.boolean().optional(),
});

// GET — admin lists all catalog entries
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "catalog-list", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  // Sort theo created_at, không phải updated_at: sửa nhãn/nhóm một item cũ
  // không được kéo nó nhảy lên đầu danh sách như thể vừa mới thêm.
  // Phân trang 1000/lượt: kho đầy đủ ~3,5 vạn món — cắt ở 2000 thì admin không
  // thấy các nhóm OB mới (OB55, OB56…) và bộ lọc OB đếm sai.
  type Row = { id: string; label: string | null; category: string | null; ob: string | null; is_hot: boolean; is_public: boolean; created_at: string; updated_at: string };
  const PAGE = 1000;
  const items: Row[] = [];
  for (let from = 0; from < 60_000; from += PAGE) {
    const { data, error } = await untypedFrom(db, "ff_items_catalog")
      .select("id, label, category, ob, is_hot, is_public, created_at, updated_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1) as { data: Row[] | null; error: unknown };
    if (error || !data) break;
    items.push(...data);
    if (data.length < PAGE) break;
  }

  return NextResponse.json({ items, count: items.length });
}

// POST — bulk upsert catalog entries
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "catalog-upsert", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const rows = parsed.data.items.map((item) => {
    const row: Record<string, unknown> = {
      id: item.id,
      label: item.label || null,
      category: item.category || null,
      is_public: item.is_public ?? true,
      created_by: user.id,
    };
    // Chỉ set khi caller gửi — tránh clobber cờ Hot/OB khi push hàng loạt
    if (item.ob !== undefined) row.ob = item.ob || null;
    if (item.is_hot !== undefined) row.is_hot = item.is_hot;
    return row;
  });

  const { error } = await untypedFrom(db, "ff_items_catalog").upsert(rows as never, {
    onConflict: "id",
    ignoreDuplicates: parsed.data.ignoreDuplicates ?? false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}

// DELETE — { ids: string[] }
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "catalog-delete", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await req.json().catch(() => null) as { ids?: string[] } | null;
  const ids = (body?.ids ?? []).filter((x): x is string => typeof x === "string").slice(0, 200);
  if (ids.length === 0) return NextResponse.json({ error: "Empty" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "ff_items_catalog").delete().in("id", ids);
  return NextResponse.json({ ok: true, removed: ids.length });
}
