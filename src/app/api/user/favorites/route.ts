import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

function getDb() {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("db unavailable");
  return db;
}

// GET — check if a specific item is bookmarked, or list all
// ?item_type=news&item_id=xxx  → { bookmarked: boolean }
// (no params)                  → array of favorites
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "favorites", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const item_type = url.searchParams.get("item_type");
  const item_id = url.searchParams.get("item_id");

  const db = getDb();

  if (item_type && item_id) {
    const { data } = await untypedFrom(db, "user_favorites")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("item_type", item_type)
      .eq("item_id", item_id)
      .maybeSingle() as { data: { id: string } | null };
    return NextResponse.json({ bookmarked: !!data });
  }

  const { data } = await untypedFrom(db, "user_favorites")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false }) as { data: unknown[] | null };

  return NextResponse.json(data ?? []);
}

// POST — add bookmark
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "favorites-write", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    item_type?: string;
    item_id?: string;
    item_title?: string;
    item_image?: string;
  };

  if (!body.item_type || !body.item_id)
    return NextResponse.json({ error: "item_type and item_id required" }, { status: 400 });

  const db = getDb();
  await untypedFrom(db, "user_favorites").upsert({
    user_id: auth.userId,
    item_type: body.item_type,
    item_id: body.item_id,
    item_title: body.item_title ?? null,
    item_image: body.item_image ?? null,
  }, { onConflict: "user_id,item_type,item_id" });

  return NextResponse.json({ ok: true });
}

// DELETE — remove bookmark
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "favorites-write", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const item_type = url.searchParams.get("item_type");
  const item_id = url.searchParams.get("item_id");

  if (!item_type || !item_id)
    return NextResponse.json({ error: "item_type and item_id required" }, { status: 400 });

  const db = getDb();
  await untypedFrom(db, "user_favorites")
    .delete()
    .eq("user_id", auth.userId)
    .eq("item_type", item_type)
    .eq("item_id", item_id);

  return NextResponse.json({ ok: true });
}
