import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const schema = z.object({
  rating_id: z.string().uuid(),
  anonymous_id: z.string().min(1),
  type: z.enum(["like", "unlike"]),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "rating-like", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const { rating_id, anonymous_id, type } = parsed.data;
  await untypedFrom(supabase, "rating_likes").upsert(
    { rating_id, anonymous_id, type } as never,
    { onConflict: "rating_id,anonymous_id" } as never
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "rating-like", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { rating_id, anonymous_id } = await request.json().catch(() => ({})) as { rating_id?: string; anonymous_id?: string };
  if (!rating_id || !anonymous_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  await untypedFrom(supabase, "rating_likes").delete().eq("rating_id", rating_id).eq("anonymous_id", anonymous_id);
  return NextResponse.json({ ok: true });
}
