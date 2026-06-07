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
    is_public: z.boolean().optional(),
  })).min(1).max(200),
});

// GET — admin lists all catalog entries
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "catalog-list", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const { data } = await untypedFrom(db, "ff_items_catalog")
    .select("id, label, category, is_public, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(2000) as { data: Array<{ id: string; label: string | null; category: string | null; is_public: boolean; created_at: string; updated_at: string }> | null };

  return NextResponse.json({ items: data ?? [], count: (data ?? []).length });
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

  const rows = parsed.data.items.map((item) => ({
    id: item.id,
    label: item.label || null,
    category: item.category || null,
    is_public: item.is_public ?? true,
    created_by: user.id,
  }));

  const { error } = await untypedFrom(db, "ff_items_catalog").upsert(rows as never, { onConflict: "id" });
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
