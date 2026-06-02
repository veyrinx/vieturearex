import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { fetchCosmetics } from "@/lib/server/forum-cosmetics";

const createSchema = z.object({
  title:    z.string().min(5).max(200),
  content:  z.string().min(20).max(20000),
  category: z.string().min(1).max(80),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "forum-list", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ posts: [] });

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const sort = url.searchParams.get("sort") ?? "latest";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 20;
  const from = (page - 1) * limit;

  let q = untypedFrom(db, "forum_posts")
    .select("id, title, category, user_id, display_name, avatar_url, view_count, reply_count, is_pinned, is_locked, created_at, updated_at", { count: "exact" })
    .eq("status", "active")
    .order("is_pinned", { ascending: false });

  if (sort === "hot") q = q.order("reply_count", { ascending: false }) as typeof q;
  else if (sort === "views") q = q.order("view_count", { ascending: false }) as typeof q;
  else q = q.order("updated_at", { ascending: false }) as typeof q;

  q = q.range(from, from + limit - 1);

  if (category && category !== "all") q = q.eq("category", category) as typeof q;

  const { data, count, error } = await q as { data: Array<{ user_id: string | null; [k: string]: unknown }> | null; count: number | null; error: unknown };
  if (error) return NextResponse.json({ posts: [], total: 0 });

  const posts = data ?? [];
  const userIds = posts.map((p) => p.user_id).filter((x): x is string => !!x);
  const cosmetics = await fetchCosmetics(db, userIds);

  const enriched = posts.map((p) => {
    const c = p.user_id ? cosmetics.get(p.user_id) : undefined;
    return { ...p, css_ring: c?.css_ring ?? null, user_title: c?.title ?? null, user_title_color: c?.title_color ?? null };
  });

  return NextResponse.json({ posts: enriched, total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "forum-post", limit: 5, windowMs: 3_600_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("display_name, avatar_url").eq("id", user.id).maybeSingle() as
    { data: { display_name: string | null; avatar_url: string | null } | null };

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: post, error } = await untypedFrom(db, "forum_posts").insert({
    title:        parsed.data.title,
    content:      parsed.data.content,
    category:     parsed.data.category,
    user_id:      user.id,
    display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh",
    avatar_url:   profile?.avatar_url ?? null,
  } as never).select("id").single() as { data: { id: string } | null; error: unknown };

  if (error || !post) return NextResponse.json({ error: "Không thể tạo bài." }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
  void import("@/lib/server/user-notify").then(({ notifyUserNewForumPost }) =>
    notifyUserNewForumPost({
      id: post.id,
      title: parsed.data.title,
      category: parsed.data.category,
      display_name: profile?.display_name ?? "Ẩn danh",
    }, siteUrl)
  );

  // Award points + check forum achievements + sync contributor_points
  void (async () => {
    try {
      await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
        .rpc("increment_user_points", { uid: user.id, amount: 10 });

      const { count } = await untypedFrom(db, "forum_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "active") as { count: number | null };

      const [{ checkForumAchievements }, { syncContributorPoints }] = await Promise.all([
        import("@/lib/server/award-achievement"),
        import("@/lib/server/contributor-sync"),
      ]);
      await checkForumAchievements(user.id, count ?? 1, 0);
      await syncContributorPoints(
        user.id,
        profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh",
        profile?.avatar_url,
        "post",
      );
    } catch { /* non-critical */ }
  })();

  return NextResponse.json({ id: post.id }, { status: 201 });
}
