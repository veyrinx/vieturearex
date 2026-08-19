import { SITE_URL } from "@/lib/constants/site";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { checkContent } from "@/lib/server/content-filter";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { POINTS } from "@/lib/constants/ranks";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { awardAchievement, evaluateAutoAchievements } from "@/lib/server/award-achievement";
import { notifyCommentReply } from "@/lib/server/notifications";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  parent_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ newsId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { newsId } = await params;
  const supabase = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ comments: [] });

  const { data, error } = await supabase
    .from("news_comments")
    .select("id, user_id, display_name, content, status, created_at, parent_id")
    .eq("news_id", newsId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200) as { data: Array<{ id: string; user_id: string | null; display_name: string; content: string; status: string; created_at: string; parent_id: string | null }> | null; error: { code?: string } | null };

  if (error) return NextResponse.json({ comments: [] });

  const comments = data ?? [];
  const userIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean))) as string[];
  const userMap: Record<string, { avatar_url: string | null; role: string | null; is_verified: boolean; badges: string[] | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users").select("id, avatar_url, role, is_verified, badges").in("id", userIds) as
      { data: Array<{ id: string; avatar_url: string | null; role: string | null; is_verified: boolean | null; badges: string[] | null }> | null };
    (profiles ?? []).forEach((p) => { userMap[p.id] = { avatar_url: p.avatar_url, role: p.role, is_verified: Boolean(p.is_verified), badges: p.badges ?? null }; });
  }

  return NextResponse.json({
    comments: comments.map((c) => {
      const u = c.user_id ? userMap[c.user_id] : undefined;
      return { ...c, avatar_url: u?.avatar_url ?? null, role: u?.role ?? null, is_verified: u?.is_verified ?? false, badges: u?.badges ?? null };
    }),
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "news-comment", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { newsId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Hệ thống bình luận tạm thời không khả dụng." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null } | null };

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Người dùng";

  const verdict = checkContent(parsed.data.content);
  if (verdict === "rejected") {
    return NextResponse.json({ error: "Bình luận chứa nội dung vi phạm. Vui lòng chỉnh sửa lại." }, { status: 422 });
  }

  const { error } = await (supabase.from("news_comments") as ReturnType<typeof supabase.from>).insert({
    news_id: newsId,
    user_id: user.id,
    display_name: displayName,
    content: parsed.data.content,
    status: verdict,
    parent_id: parsed.data.parent_id ?? null,
  } as never);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST204") {
      return NextResponse.json({ error: "Hệ thống bình luận đang được thiết lập. Vui lòng thử lại sau." }, { status: 503 });
    }
    return NextResponse.json({ error: "Không thể gửi bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  await logAdminActivity({
    action: "USER_COMMENTED",
    targetType: "NEWS",
    targetId: newsId,
    summary: `${displayName} (${user.email}) bình luận bài viết ${newsId}`,
  }).catch(() => {});

  // Award points and achievements for approved comment
  if (verdict === "approved") {
    const admin = createAdminSupabaseClient();
    if (admin) {
      void (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
        .rpc("increment_user_points", { uid: user.id, amount: POINTS.COMMENT_APPROVED })
        .catch(() => null);
    }
    void awardAchievement(user.id, "first_comment");
    void evaluateAutoAchievements(user.id).catch(() => null);

    // Notify parent comment author on reply
    if (parsed.data.parent_id) {
      const siteUrl = SITE_URL;
      void (async () => {
        const db = createAdminSupabaseClient() ?? supabase;
        if (!db) return;
        const [parentRes, newsRes] = await Promise.all([
          (db as unknown as { from: (t: string) => { select: (f: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { user_id: string | null } | null }> } } } })
            .from("news_comments").select("user_id").eq("id", parsed.data.parent_id!).maybeSingle(),
          (db as unknown as { from: (t: string) => { select: (f: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { slug: string } | null }> } } } })
            .from("news").select("slug").eq("id", newsId).maybeSingle(),
        ]);
        const parentUserId = parentRes.data?.user_id;
        const slug = newsRes.data?.slug;
        if (parentUserId && parentUserId !== user.id && slug) {
          void notifyCommentReply(parentUserId, displayName, newsId, slug, siteUrl).catch(() => null);
        }
      })();
    }
  }

  if (verdict === "pending") {
    const siteUrl = SITE_URL;
    const payload = {
      title: "💬 Bình luận chờ duyệt — Bài viết",
      subtitle: vnNow(),
      sections: [{ icon: "⏳", heading: displayName, rows: [
        { label: "Nội dung", value: parsed.data.content.slice(0, 200) },
        { label: "Bài viết ID", value: newsId, mono: true },
      ]}],
      actions: [{ label: "Kiểm duyệt ngay", url: `${siteUrl}/admin/comments` }],
      footer: "✨ Arex Admin",
    };
    void Promise.allSettled([
      sendTelegramNotification(payload),
      sendDiscordInternalNotification(payload, DISCORD_COLORS.warn),
    ]);
    return NextResponse.json({ ok: true, pending: true, message: "Bình luận của bạn đang chờ kiểm duyệt." });
  }
  return NextResponse.json({ ok: true });
}
