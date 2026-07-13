import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { PLAYSTYLE_VALUES } from "@/lib/constants/weapon-types";

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/, "Slug chỉ gồm a-z, 0-9, gạch nối."),
  name: z.string().min(1).max(120),
  description: z.string().max(4000).optional().nullable(),
  image_url: z.string().max(1000).optional().nullable(),
  playstyle: z.enum(PLAYSTYLE_VALUES as [string, ...string[]]).optional().nullable(),
  primary_weapon_id: z.string().uuid().optional().nullable(),
  secondary_weapon_id: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).max(100000).optional().nullable(),
});

const LOADOUT_SELECT =
  "id, slug, name, description, image_url, playstyle, position, primary_weapon_id, secondary_weapon_id, " +
  "primary_weapon:ff_weapons!primary_weapon_id(id, name, image_url), " +
  "secondary_weapon:ff_weapons!secondary_weapon_id(id, name, image_url)";

// GET — list all loadouts (admin)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-loadouts-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ loadouts: [] });

  const { data } = await untypedFrom(db, "ff_loadouts")
    .select(LOADOUT_SELECT)
    .order("position", { ascending: true })
    .order("name", { ascending: true })
    .limit(200) as { data: unknown[] | null };

  return NextResponse.json({ loadouts: data ?? [], count: (data ?? []).length });
}

// POST — create or update a loadout
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-loadouts-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id, ...fields } = parsed.data;
  const payload = {
    slug: fields.slug,
    name: fields.name,
    description: fields.description?.trim() || null,
    image_url: fields.image_url?.trim() || null,
    playstyle: fields.playstyle || null,
    primary_weapon_id: fields.primary_weapon_id || null,
    secondary_weapon_id: fields.secondary_weapon_id || null,
    position: fields.position ?? 0,
  };

  let loadoutId = id ?? null;

  if (loadoutId) {
    const { error } = await untypedFrom(db, "ff_loadouts")
      .update({ ...payload, updated_at: new Date().toISOString() } as never)
      .eq("id", loadoutId);
    if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  } else {
    const { data: created, error } = await untypedFrom(db, "ff_loadouts")
      .insert(payload as never)
      .select("id")
      .single() as { data: { id: string } | null; error: { message?: string; code?: string } | null };
    if (error || !created) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
    loadoutId = created.id;
  }

  await logAdminActivity({
    action: id ? "LOADOUT_UPDATED" : "LOADOUT_CREATED",
    targetType: "LOADOUT",
    targetId: loadoutId,
    summary: `${id ? "Cập nhật" : "Tạo"} combo ${fields.name}`,
  });

  return NextResponse.json({ ok: true, id: loadoutId });
}

// DELETE — ?id= or { id }
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-loadouts-delete", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const url = new URL(req.url);
  const body = await req.json().catch(() => null) as { id?: string } | null;
  const id = url.searchParams.get("id") ?? body?.id ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "ff_loadouts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "LOADOUT_DELETED",
    targetType: "LOADOUT",
    targetId: id,
    summary: `Xóa combo ${id}`,
  });

  return NextResponse.json({ ok: true });
}

function errorMessage(error: { message?: string; code?: string } | null): string {
  if (error?.code === "23505") return "Slug đã tồn tại. Chọn slug khác.";
  return error?.message ?? "Thao tác thất bại.";
}
