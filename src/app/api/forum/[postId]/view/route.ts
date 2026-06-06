import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

type Ctx = { params: Promise<{ postId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-view", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false });

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("id, view_count")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle() as { data: { id: string; view_count: number } | null };

  if (!post) return NextResponse.json({ ok: false }, { status: 404 });

  await untypedFrom(db, "forum_posts")
    .update({ view_count: (post.view_count ?? 0) + 1 } as never)
    .eq("id", post.id);

  return NextResponse.json({ ok: true, view_count: (post.view_count ?? 0) + 1 });
}
