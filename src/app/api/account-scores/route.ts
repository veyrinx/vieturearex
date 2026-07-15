import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const schema = z.object({
  ff_name: z.string().trim().min(2).max(30),
  score: z.number().int().min(0).max(100000),
  tier: z.string().max(40).optional().nullable(),
});

// POST — đăng/cập nhật điểm nick lên BXH (giữ bản mới nhất theo tên)
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "account-score", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "account_scores").upsert(
    {
      ff_name: parsed.data.ff_name.trim(),
      score: parsed.data.score,
      tier: parsed.data.tier ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "ff_name" },
  );
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Tên đã tồn tại." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET — top nick theo điểm
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "account-score-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const { data } = await untypedFrom(db, "account_scores")
    .select("ff_name, score, tier")
    .order("score", { ascending: false })
    .limit(100) as { data: Array<{ ff_name: string; score: number; tier: string | null }> | null };

  return NextResponse.json({ items: data ?? [] });
}
