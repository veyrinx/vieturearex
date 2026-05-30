import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

const schema = z.object({ category: z.string().min(1).max(100) });

async function getUser() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ follows: [] });
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ follows: [] });
  const { data } = (await untypedFrom(db, "user_category_follows")
    .select("category")
    .eq("user_id", user.id)) as { data: { category: string }[] | null };
  return NextResponse.json({ follows: (data ?? []).map((r) => r.category) });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "follows", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await untypedFrom(db, "user_category_follows").upsert(
    { user_id: user.id, category: parsed.data.category } as never,
    { onConflict: "user_id,category" },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "follows", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await untypedFrom(db, "user_category_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("category", parsed.data.category);
  return NextResponse.json({ ok: true });
}
