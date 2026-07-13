import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { WEAPON_TYPE_VALUES, ATTACHMENT_SLOT_VALUES } from "@/lib/constants/weapon-types";

const nullableInt = z.number().int().min(0).max(100000).optional().nullable();

const attachmentSchema = z.object({
  slot: z.enum(ATTACHMENT_SLOT_VALUES as [string, ...string[]]),
  name: z.string().min(1).max(120),
  note: z.string().max(300).optional().nullable(),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/, "Slug chỉ gồm a-z, 0-9, gạch nối."),
  name: z.string().min(1).max(120),
  description: z.string().max(4000).optional().nullable(),
  image_url: z.string().min(1).max(1000),
  damage: nullableInt,
  range: nullableInt,
  rate_of_fire: nullableInt,
  reload: nullableInt,
  magazine: nullableInt,
  weapon_type: z.enum(WEAPON_TYPE_VALUES as [string, ...string[]]).optional().nullable(),
  ob: z.string().max(30).optional().nullable(),
  attachments: z.array(attachmentSchema).max(20).optional(),
  released_at: z.string().max(30).optional().nullable(),
});

type WeaponRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string;
  damage: number | null;
  range: number | null;
  rate_of_fire: number | null;
  reload: number | null;
  magazine: number | null;
  weapon_type: string | null;
  ob: string | null;
  attachments: unknown;
  released_at: string | null;
  updated_at: string;
};

// GET — list all weapons (admin)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-weapons-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ weapons: [] });

  const { data } = await untypedFrom(db, "ff_weapons")
    .select("id, slug, name, description, image_url, damage, range, rate_of_fire, reload, magazine, weapon_type, ob, attachments, released_at, updated_at")
    .order("name", { ascending: true })
    .limit(500) as { data: WeaponRow[] | null };

  return NextResponse.json({ weapons: data ?? [], count: (data ?? []).length });
}

// POST — create or update a weapon
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-weapons-post", limit: 30, windowMs: 60_000 });
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
    description: fields.description || null,
    image_url: fields.image_url,
    damage: fields.damage ?? null,
    range: fields.range ?? null,
    rate_of_fire: fields.rate_of_fire ?? null,
    reload: fields.reload ?? null,
    magazine: fields.magazine ?? null,
    weapon_type: fields.weapon_type || null,
    ob: fields.ob?.trim() || null,
    attachments: (fields.attachments ?? []).map((a) => ({
      slot: a.slot,
      name: a.name.trim(),
      note: a.note?.trim() || null,
    })),
    released_at: fields.released_at || null,
  };

  let weaponId = id ?? null;

  if (weaponId) {
    const { error } = await untypedFrom(db, "ff_weapons")
      .update({ ...payload, updated_at: new Date().toISOString() } as never)
      .eq("id", weaponId);
    if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  } else {
    const { data: created, error } = await untypedFrom(db, "ff_weapons")
      .insert(payload as never)
      .select("id")
      .single() as { data: { id: string } | null; error: { message?: string; code?: string } | null };
    if (error || !created) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
    weaponId = created.id;
  }

  await logAdminActivity({
    action: id ? "WEAPON_UPDATED" : "WEAPON_CREATED",
    targetType: "WEAPON",
    targetId: weaponId,
    summary: `${id ? "Cập nhật" : "Tạo"} vũ khí ${fields.name}`,
  });

  return NextResponse.json({ ok: true, id: weaponId });
}

// DELETE — ?id= or { id }
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-weapons-delete", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const url = new URL(req.url);
  const body = await req.json().catch(() => null) as { id?: string } | null;
  const id = url.searchParams.get("id") ?? body?.id ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "ff_weapons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "WEAPON_DELETED",
    targetType: "WEAPON",
    targetId: id,
    summary: `Xóa vũ khí ${id}`,
  });

  return NextResponse.json({ ok: true });
}

function errorMessage(error: { message?: string; code?: string } | null): string {
  if (error?.code === "23505") return "Slug đã tồn tại. Chọn slug khác.";
  return error?.message ?? "Thao tác thất bại.";
}
