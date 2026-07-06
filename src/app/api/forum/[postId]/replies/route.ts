import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { fetchCosmetics } from "@/lib/server/forum-cosmetics";

type Ctx = { params: Promise<{ postId: string }> };

const schema = z.object({
  content:   z.string().min(2).max(3000),
  parent_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-replies", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ replies: [] });

  const { data } = await untypedFrom(db, "forum_replies")
    .select("id, user_id, display_name, avatar_url, content, parent_id, created_at")
    .eq("post_id", postId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(500) as { data: Array<{ user_id: string | null; [k: string]: unknown }> | null };

  const replies = data ?? [];
  const userIds = replies.map((r) => r.user_id).filter((x): x is string => !!x);
  const cosmetics = await fetchCosmetics(db, userIds);

  const enriched = replies.map((r) => {
    const c = r.user_id ? cosmetics.get(r.user_id) : undefined;
    return { ...r, css_ring: c?.css_ring ?? null, user_title: c?.title ?? null, user_title_color: c?.title_color ?? null, role: c?.role ?? null, is_verified: c?.is_verified ?? false };
  });

  return NextResponse.json({ replies: enriched });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-reply-post", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("display_name, avatar_url").eq("id", user.id).maybeSingle() as
    { data: { display_name: string | null; avatar_url: string | null } | null };

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: reply, error } = await untypedFrom(db, "forum_replies").insert({
    post_id:      postId,
    user_id:      user.id,
    display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh",
    avatar_url:   profile?.avatar_url ?? null,
    content:      parsed.data.content,
    parent_id:    parsed.data.parent_id ?? null,
  } as never).select("id, display_name, avatar_url, content, parent_id, created_at").single() as
    { data: unknown; error: unknown };

  if (error || !reply) {
    console.error("[forum] create reply failed:", error);
    return NextResponse.json({ error: "Không thể gửi trả lời." }, { status: 500 });
  }

  // Notify the post author (if different from replier)
  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("user_id, title")
    .eq("id", postId)
    .single() as { data: { user_id: string | null; title: string } | null };

  if (post?.user_id && post.user_id !== user.id) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    void import("@/lib/server/notifications").then(({ createNotification }) =>
      createNotification({
        user_id: post.user_id!,
        type: "forum_reply",
        title: `${profile?.display_name ?? "Ai đó"} đã trả lời bài viết của bạn`,
        body: parsed.data.content.slice(0, 120),
        entity_type: "forum_post",
        entity_id: postId,
        entity_url: `${siteUrl}/cong-dong/${postId}`,
      })
    );
  }

  // Award points + check reply achievement + check post popularity
  void (async () => {
    try {
      await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
        .rpc("increment_user_points", { uid: user.id, amount: 5 });

      const { count: replyCount } = await untypedFrom(db, "forum_replies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "active") as { count: number | null };

      const [{ checkForumAchievements, checkForumPopularAchievement }, { syncContributorPoints }] = await Promise.all([
        import("@/lib/server/award-achievement"),
        import("@/lib/server/contributor-sync"),
      ]);
      await checkForumAchievements(user.id, 0, replyCount ?? 1);
      await syncContributorPoints(
        user.id,
        profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh",
        profile?.avatar_url,
        "reply",
      );

      // Check if the original post is now popular (10+ replies)
      if (post?.user_id) {
        const { count: postReplyCount } = await untypedFrom(db, "forum_replies")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId).eq("status", "active") as { count: number | null };
        await checkForumPopularAchievement(post.user_id, postReplyCount ?? 0);
      }
    } catch { /* non-critical */ }
  })();

  return NextResponse.json(reply, { status: 201 });
}
