import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { POINTS } from "@/lib/constants/ranks";

const schema = z.object({ newsId: z.string().min(1).max(100) });

export async function POST(request: NextRequest) {
  // Rate limit per IP — at most 30 view-awards per minute
  const limited = enforceRateLimit(request, { name: "award-view", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ ok: false });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  // Award point silently — failures are non-fatal
  const admin = createAdminSupabaseClient();
  if (admin) {
    void (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: user.id, amount: POINTS.ARTICLE_VIEW })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
