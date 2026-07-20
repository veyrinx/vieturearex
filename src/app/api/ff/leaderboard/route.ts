import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

// GET /api/ff/leaderboard — top nick VN theo điểm độ khủng (tự động).
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "ff-leaderboard", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  try {
    const { data } = (await untypedFrom(db, "ff_auto_scores")
      .select("ff_id, nickname, level, likes, br_rank_point, score")
      .eq("region", "VN")
      .order("score", { ascending: false })
      .limit(100)) as { data: unknown[] | null };
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
