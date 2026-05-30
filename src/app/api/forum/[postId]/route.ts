import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

type Ctx = { params: Promise<{ postId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-detail", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json(null, { status: 503 });

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("*")
    .eq("id", postId)
    .eq("status", "active")
    .single() as { data: unknown };

  if (!post) return NextResponse.json(null, { status: 404 });

  // Increment view count (fire & forget)
  void untypedFrom(db, "forum_posts")
    .update({ view_count: ((post as { view_count: number }).view_count ?? 0) + 1 } as never)
    .eq("id", postId);

  return NextResponse.json(post);
}
