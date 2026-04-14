import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const submitSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  anonymous_id: z.string().min(1).max(20),
  stars: z.number().int().min(1).max(5),
  review: z.string().max(500).optional().default(""),
});

type LikeRow = { anonymous_id: string; type: string };
type ReplyRow = { id: string; content: string; created_at: string };
type RatingRow = { id: string; anonymous_id: string; stars: number; review: string | null; created_at: string; admin_liked: boolean; likes: LikeRow[]; replies: ReplyRow[] };

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "ratings-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ ratings: [], stats: {} });

  const { data } = await untypedFrom(supabase, "news_ratings")
    .select(`id, anonymous_id, stars, review, created_at, admin_liked,
      likes:rating_likes(anonymous_id, type),
      replies:rating_replies(id, content, created_at)`)
    .eq("slug", slug)
    .order("admin_liked", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20) as { data: RatingRow[] | null };

  const ratings = data ?? [];
  const stats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) stats[r.stars] = (stats[r.stars] ?? 0) + 1;

  return NextResponse.json({ ratings, stats });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "ratings-post", limit: 3, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server error." }, { status: 500 });

  const { data: existing } = await untypedFrom(supabase, "news_ratings")
    .select("id")
    .eq("slug", parsed.data.slug)
    .eq("anonymous_id", parsed.data.anonymous_id)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) return NextResponse.json({ error: "Bạn đã đánh giá bài viết này rồi." }, { status: 409 });

  const { error } = await untypedFrom(supabase, "news_ratings").insert({
    slug: parsed.data.slug,
    title: parsed.data.title,
    anonymous_id: parsed.data.anonymous_id,
    stars: parsed.data.stars,
    review: parsed.data.review || null,
  } as never) as { error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (webAppUrl) {
    void fetch(webAppUrl, {
      method: "POST",
      body: JSON.stringify({ time: new Date().toLocaleString("vi-VN"), slug: parsed.data.slug, title: parsed.data.title, name: parsed.data.anonymous_id, stars: parsed.data.stars, review: parsed.data.review }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
