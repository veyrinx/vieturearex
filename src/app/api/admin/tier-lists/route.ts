import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";

const entrySchema = z.object({
  ref_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(120),
  image_url: z.string().min(1).max(1000),
  tier: z.enum(["S", "A", "B", "C", "D"]),
  position: z.number().int().min(0).max(9999).optional(),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  kind: z.enum(["character", "weapon"]),
  patch: z.string().min(1).max(40),
  title: z.string().max(160).optional().nullable(),
  entries: z.array(entrySchema).max(500),
});

type ListRow = {
  id: string;
  kind: string;
  patch: string;
  title: string | null;
  updated_at: string;
  created_at: string;
  tier_list_entries: Array<{
    id: string;
    ref_id: string | null;
    name: string;
    image_url: string;
    tier: string;
    position: number | null;
  }> | null;
};

// GET — list all tier lists with their entries (admin)
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-tier-lists-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ lists: [] });

  const { data } = await untypedFrom(db, "tier_lists")
    .select("id, kind, patch, title, created_at, updated_at, tier_list_entries(id, ref_id, name, image_url, tier, position)")
    .order("updated_at", { ascending: false })
    .limit(200) as { data: ListRow[] | null };

  const lists = (data ?? []).map((l) => ({
    id: l.id,
    kind: l.kind,
    patch: l.patch,
    title: l.title,
    updated_at: l.updated_at,
    entries: (l.tier_list_entries ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }));

  return NextResponse.json({ lists, count: lists.length });
}

// POST — create or update a tier list (with its entries replaced wholesale)
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-tier-lists-post", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id, kind, patch, title, entries } = parsed.data;
  const now = new Date().toISOString();

  let listId = id ?? null;

  if (listId) {
    const { error } = await untypedFrom(db, "tier_lists")
      .update({ kind, patch, title: title || null, updated_at: now } as never)
      .eq("id", listId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await untypedFrom(db, "tier_list_entries").delete().eq("tier_list_id", listId);
  } else {
    const { data: created, error } = await untypedFrom(db, "tier_lists")
      .insert({ kind, patch, title: title || null } as never)
      .select("id")
      .single() as { data: { id: string } | null; error: { message?: string } | null };
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "Không thể tạo tier list." }, { status: 500 });
    }
    listId = created.id;
  }

  if (entries.length > 0) {
    const rows = entries.map((e, i) => ({
      tier_list_id: listId,
      ref_id: e.ref_id || null,
      name: e.name,
      image_url: e.image_url,
      tier: e.tier,
      position: e.position ?? i,
    }));
    const { error } = await untypedFrom(db, "tier_list_entries").insert(rows as never);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminActivity({
    action: id ? "TIER_LIST_UPDATED" : "TIER_LIST_CREATED",
    targetType: "TIER_LIST",
    targetId: listId,
    summary: `${id ? "Cập nhật" : "Tạo"} tier list ${kind === "character" ? "nhân vật" : "vũ khí"} OB${patch} (${entries.length} mục)`,
  });

  return NextResponse.json({ ok: true, id: listId });
}

// DELETE — ?id= or { id } removes a tier list (entries cascade)
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-tier-lists-delete", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const url = new URL(req.url);
  const body = await req.json().catch(() => null) as { id?: string } | null;
  const id = url.searchParams.get("id") ?? body?.id ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "tier_lists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "TIER_LIST_DELETED",
    targetType: "TIER_LIST",
    targetId: id,
    summary: `Xóa tier list ${id}`,
  });

  return NextResponse.json({ ok: true });
}
