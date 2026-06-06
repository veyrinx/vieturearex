import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "wiki-view", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { slug } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false });

  const { data: article } = await untypedFrom(db, "wiki_articles")
    .select("id, view_count")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle() as { data: { id: string; view_count: number } | null };

  if (!article) return NextResponse.json({ ok: false }, { status: 404 });

  await untypedFrom(db, "wiki_articles")
    .update({ view_count: (article.view_count ?? 0) + 1 } as never)
    .eq("id", article.id);

  return NextResponse.json({ ok: true, view_count: (article.view_count ?? 0) + 1 });
}
