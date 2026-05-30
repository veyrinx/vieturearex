import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "community-trends", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const sevenDaysAgo  = new Date(Date.now() - 7  * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [hotPostsRes, topContribRes, newMembersRes, totalPostsRes, totalRepliesRes, totalWikiRes, catStatsRes] =
    await Promise.all([
      // Hot posts (last 7 days, scored)
      untypedFrom(db, "forum_posts")
        .select("id, title, category, display_name, view_count, reply_count, helpful_count, created_at")
        .eq("status", "active")
        .gte("created_at", sevenDaysAgo)
        .limit(50) as unknown as Promise<{ data: {
          id: string; title: string; category: string; display_name: string;
          view_count: number; reply_count: number; helpful_count: number; created_at: string;
        }[] | null }>,

      // Top contributors
      untypedFrom(db, "contributor_points")
        .select("user_id, display_name, avatar_url, total_points, posts_count, wiki_count, badge")
        .order("total_points", { ascending: false })
        .limit(10) as unknown as Promise<{ data: {
          user_id: string; display_name: string | null; avatar_url: string | null;
          total_points: number; posts_count: number; wiki_count: number; badge: string;
        }[] | null }>,

      // New members
      untypedFrom(db, "users")
        .select("id, display_name, avatar_url, created_at")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(6) as unknown as Promise<{ data: {
          id: string; display_name: string | null; avatar_url: string | null; created_at: string;
        }[] | null }>,

      // Total posts
      untypedFrom(db, "forum_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "active") as unknown as Promise<{ count: number | null }>,

      // Total replies
      untypedFrom(db, "forum_replies")
        .select("*", { count: "exact", head: true })
        .eq("status", "active") as unknown as Promise<{ count: number | null }>,

      // Total wiki articles
      untypedFrom(db, "wiki_articles")
        .select("*", { count: "exact", head: true })
        .eq("status", "published") as unknown as Promise<{ count: number | null }>,

      // Category stats (last 30 days)
      untypedFrom(db, "forum_posts")
        .select("category")
        .eq("status", "active")
        .gte("created_at", thirtyDaysAgo) as unknown as Promise<{ data: { category: string }[] | null }>,
    ]);

  // Sort hot posts by score
  const hotPosts = (hotPostsRes.data ?? [])
    .map((p) => ({
      ...p,
      score: p.view_count + p.reply_count * 2 + p.helpful_count * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Build category stats from raw data
  const catMap = new Map<string, number>();
  for (const row of catStatsRes.data ?? []) {
    catMap.set(row.category, (catMap.get(row.category) ?? 0) + 1);
  }
  const categoryStats = [...catMap.entries()]
    .map(([category, post_count]) => ({ category, post_count }))
    .sort((a, b) => b.post_count - a.post_count)
    .slice(0, 8);

  return NextResponse.json({
    hotPosts,
    topContributors: topContribRes.data ?? [],
    categoryStats,
    newMembers:      newMembersRes.data ?? [],
    stats: {
      totalPosts:   totalPostsRes.count ?? 0,
      totalReplies: totalRepliesRes.count ?? 0,
      totalWiki:    totalWikiRes.count ?? 0,
      newThisWeek:  (newMembersRes.data ?? []).length,
    },
  });
}
