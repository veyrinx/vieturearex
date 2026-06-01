import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "user-posts", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ posts: [] });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ posts: [] });

  const db = createAdminSupabaseClient() ?? supabase;

  const { data } = await untypedFrom(db, "forum_posts")
    .select("id, title, category, view_count, reply_count, is_pinned, is_locked, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50) as { data: unknown[] | null };

  return NextResponse.json({ posts: data ?? [] });
}
