import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const schema = z.object({
  score: z.number().int().min(0).max(100000),
  tier: z.string().max(40).optional().nullable(),
});

// POST — đăng điểm nick lên BXH bằng CHÍNH tài khoản đang đăng nhập (không nhập tên tay)
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "account-score", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Hãy đăng nhập để đăng lên BXH." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Lấy ID FF + tên + avatar từ hồ sơ người chơi
  const { data: profile } = await untypedFrom(db, "users")
    .select("ff_id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle() as { data: { ff_id: string | null; display_name: string | null; avatar_url: string | null } | null };

  const { error } = await untypedFrom(db, "account_scores").upsert(
    {
      user_id: user.id,
      ff_id: profile?.ff_id ?? null,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      score: parsed.data.score,
      tier: parsed.data.tier ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// GET — top nick theo điểm
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "account-score-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const { data } = await untypedFrom(db, "account_scores")
    .select("ff_id, display_name, avatar_url, score, tier")
    .order("score", { ascending: false })
    .limit(100) as { data: unknown[] | null };

  return NextResponse.json({ items: data ?? [] });
}
