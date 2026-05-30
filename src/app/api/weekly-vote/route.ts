import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

function getWeekKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  // ISO week: week containing the first Thursday of January
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfFirstWeek = new Date(jan4);
  startOfFirstWeek.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const daysDiff = Math.floor((now.getTime() - startOfFirstWeek.getTime()) / 86_400_000);
  const week = Math.floor(daysDiff / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

type PostRow = {
  id: string;
  title: string;
  category: string;
  display_name: string;
  view_count: number;
  reply_count: number;
};

type VoteCountRow = {
  post_id: string;
  vote_count: string; // aggregate comes as string in Supabase
};

const voteSchema = z.object({
  post_id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "weekly-vote-get", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ weekKey: getWeekKey(), posts: [], myVote: null });

  const weekKey = getWeekKey();

  // Get vote counts for this week
  const { data: voteCounts } = await untypedFrom(db, "weekly_post_votes")
    .select("post_id, vote_count:post_id.count()")
    .eq("week_key", weekKey) as { data: VoteCountRow[] | null };

  const voteMap = new Map<string, number>();
  for (const row of voteCounts ?? []) {
    voteMap.set(row.post_id, parseInt(String(row.vote_count), 10) || 0);
  }

  const postIds = [...voteMap.keys()];

  let posts: (PostRow & { vote_count: number })[] = [];

  if (postIds.length > 0) {
    const { data: postData } = await untypedFrom(db, "forum_posts")
      .select("id, title, category, display_name, view_count, reply_count")
      .eq("status", "active")
      .in("id", postIds) as { data: PostRow[] | null };

    posts = (postData ?? [])
      .map((p) => ({ ...p, vote_count: voteMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 10);
  }

  // Check current user's vote
  let myVote: string | null = null;
  const supabase = createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (user) {
      const { data: myVoteData } = await untypedFrom(db, "weekly_post_votes")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("week_key", weekKey)
        .maybeSingle() as { data: { post_id: string } | null };
      myVote = myVoteData?.post_id ?? null;
    }
  }

  return NextResponse.json({ weekKey, posts, myVote });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "weekly-vote-post", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "post_id không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const weekKey = getWeekKey();

  // Delete existing vote for this week (replace logic)
  await untypedFrom(db, "weekly_post_votes")
    .delete()
    .eq("user_id", user.id)
    .eq("week_key", weekKey);

  // Insert new vote
  const { error } = await untypedFrom(db, "weekly_post_votes").insert({
    post_id:  parsed.data.post_id,
    user_id:  user.id,
    week_key: weekKey,
  } as never);

  if (error) return NextResponse.json({ error: "Không thể ghi nhận bình chọn." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
