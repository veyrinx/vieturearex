import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

type SuggestedUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_verified: boolean;
  total_points: number;
  badge: string | null;
};

// GET: returns top contributors that the current user is NOT following yet
export async function GET() {
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ users: [] });

  const supabase = createServerSupabaseClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser().catch(() => ({ data: { user: null } })) : { data: { user: null } };

  // Top contributors by points
  const { data: contribs } = await untypedFrom(db, "contributor_points")
    .select("user_id, display_name, avatar_url, total_points, badge")
    .order("total_points", { ascending: false })
    .limit(20) as { data: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; total_points: number; badge: string | null }> | null };

  if (!contribs || contribs.length === 0) return NextResponse.json({ users: [] });

  // Get current user's existing follows (to exclude)
  let alreadyFollowing = new Set<string>();
  if (user) {
    const { data: follows } = await untypedFrom(db, "user_user_follows")
      .select("following_id")
      .eq("follower_id", user.id) as { data: Array<{ following_id: string }> | null };
    alreadyFollowing = new Set((follows ?? []).map((f) => f.following_id));
  }

  const candidateIds = contribs
    .map((c) => c.user_id)
    .filter((id) => id !== user?.id && !alreadyFollowing.has(id));

  if (candidateIds.length === 0) return NextResponse.json({ users: [] });

  // Get role for each
  const { data: users } = await untypedFrom(db, "users")
    .select("id, role, is_verified")
    .in("id", candidateIds) as { data: Array<{ id: string; role: string | null; is_verified: boolean | null }> | null };
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  // Take top 6
  const result: SuggestedUser[] = contribs
    .filter((c) => candidateIds.includes(c.user_id))
    .slice(0, 6)
    .map((c) => ({
      id: c.user_id,
      display_name: c.display_name,
      avatar_url: c.avatar_url,
      role: userMap.get(c.user_id)?.role ?? null,
      is_verified: userMap.get(c.user_id)?.is_verified ?? false,
      total_points: c.total_points,
      badge: c.badge,
    }));

  return NextResponse.json({ users: result });
}
