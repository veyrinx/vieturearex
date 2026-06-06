import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

type FeedItem = {
  type: "forum_post" | "wiki_article";
  id: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  cover_url?: string | null;
  url: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ items: [] });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ items: [], requiresAuth: true });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  // Get list of users I follow
  const { data: followsData } = await untypedFrom(db, "user_user_follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .limit(500) as { data: Array<{ following_id: string }> | null };

  const followingIds = (followsData ?? []).map((f) => f.following_id);
  if (followingIds.length === 0) {
    return NextResponse.json({ items: [], followingCount: 0 });
  }

  // Fetch user info for followed users
  const { data: usersData } = await untypedFrom(db, "users")
    .select("id, display_name, avatar_url")
    .in("id", followingIds) as { data: Array<{ id: string; display_name: string | null; avatar_url: string | null }> | null };
  const userMap = new Map((usersData ?? []).map((u) => [u.id, u]));

  // Fetch latest forum posts from followed users
  const [forumRes, wikiRes] = await Promise.all([
    untypedFrom(db, "forum_posts")
      .select("id, title, category, user_id, created_at")
      .in("user_id", followingIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(30) as unknown as Promise<{ data: Array<{ id: string; title: string; category: string; user_id: string; created_at: string }> | null }>,
    untypedFrom(db, "wiki_articles")
      .select("id, slug, title, excerpt, category, cover_url, author_id, created_at")
      .in("author_id", followingIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30) as unknown as Promise<{ data: Array<{ id: string; slug: string; title: string; excerpt: string | null; category: string; cover_url: string | null; author_id: string; created_at: string }> | null }>,
  ]);

  const items: FeedItem[] = [];

  for (const p of forumRes.data ?? []) {
    const u = userMap.get(p.user_id);
    items.push({
      type: "forum_post",
      id: p.id,
      title: p.title,
      category: p.category,
      url: `/cong-dong/${p.id}`,
      user_id: p.user_id,
      display_name: u?.display_name ?? null,
      avatar_url: u?.avatar_url ?? null,
      created_at: p.created_at,
    });
  }

  for (const w of wikiRes.data ?? []) {
    const u = userMap.get(w.author_id);
    items.push({
      type: "wiki_article",
      id: w.id,
      title: w.title,
      excerpt: w.excerpt,
      category: w.category,
      cover_url: w.cover_url,
      url: `/wiki/${w.slug}`,
      user_id: w.author_id,
      display_name: u?.display_name ?? null,
      avatar_url: u?.avatar_url ?? null,
      created_at: w.created_at,
    });
  }

  // Sort by created_at desc, limit to 40 latest
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ items: items.slice(0, 40), followingCount: followingIds.length });
}
