import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

const CURRENT_SEASON = "S1";

const voteSchema = z.object({
  character_id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "char-vote-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ characters: [], myVote: null });

  const { data: chars } = await untypedFrom(db, "character_votes_config")
    .select("id, name, image_url, ability, description, sort_order")
    .eq("is_active", true)
    .eq("season", CURRENT_SEASON)
    .order("sort_order", { ascending: true }) as { data: Array<{ id: string; name: string; image_url: string | null; ability: string; description: string; sort_order: number }> | null };

  const { data: votes } = await untypedFrom(db, "character_vote_logs")
    .select("character_id")
    .eq("season", CURRENT_SEASON) as { data: Array<{ character_id: string }> | null };

  const countMap: Record<string, number> = {};
  for (const v of votes ?? []) {
    countMap[v.character_id] = (countMap[v.character_id] ?? 0) + 1;
  }
  const totalVotes = Object.values(countMap).reduce((a, b) => a + b, 0);

  const characters = (chars ?? []).map((c) => ({
    ...c,
    votes: countMap[c.id] ?? 0,
    percent: totalVotes > 0 ? Math.round(((countMap[c.id] ?? 0) / totalVotes) * 100) : 0,
  }));

  // Check current user's vote
  let myVote: string | null = null;
  const supabase = createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (user) {
      const { data: log } = await untypedFrom(db, "character_vote_logs")
        .select("character_id")
        .eq("user_id", user.id)
        .eq("season", CURRENT_SEASON)
        .maybeSingle() as { data: { character_id: string } | null };
      myVote = log?.character_id ?? null;
    }
  }

  return NextResponse.json({ characters, totalVotes, myVote, season: CURRENT_SEASON });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "char-vote-post", limit: 10, windowMs: 3_600_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập để bình chọn." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình chọn." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Delete existing vote for this season, then insert new one (change vote)
  await untypedFrom(db, "character_vote_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("season", CURRENT_SEASON);

  const { error } = await untypedFrom(db, "character_vote_logs").insert({
    character_id: parsed.data.character_id,
    user_id:      user.id,
    season:       CURRENT_SEASON,
  } as never);

  if (error) return NextResponse.json({ error: "Không thể lưu bình chọn." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
