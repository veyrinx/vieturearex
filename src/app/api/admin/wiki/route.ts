import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  author_name: string;
  view_count: number;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ articles: [] });

  const { data } = await (untypedFrom(db, "wiki_articles")
    .select("id, slug, title, category, status, author_name, view_count, edit_count, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as Promise<{ data: WikiArticle[] | null }>);

  return NextResponse.json({ articles: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-del", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { slug } = await request.json().catch(() => ({})) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "wiki_articles").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: "Không thể xóa bài wiki" }, { status: 500 });

  void logAdminActivity({
    action: "wiki_delete",
    targetType: "wiki",
    targetId: slug,
    summary: `Xóa bài wiki "${slug}"`,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-patch", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { slug, status } = await request.json().catch(() => ({})) as { slug?: string; status?: string };
  if (!slug || !status) return NextResponse.json({ error: "Thiếu slug hoặc status" }, { status: 400 });
  if (!["published", "draft"].includes(status)) return NextResponse.json({ error: "Status không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: prev } = await untypedFrom(db, "wiki_articles")
    .select("title, category, author_name, status")
    .eq("slug", slug).single() as { data: { title: string; category: string; author_name: string; status: string } | null };

  const { error } = await untypedFrom(db, "wiki_articles").update({ status } as never).eq("slug", slug);
  if (error) return NextResponse.json({ error: "Không thể cập nhật trạng thái" }, { status: 500 });

  void logAdminActivity({
    action: "wiki_status",
    targetType: "wiki",
    targetId: slug,
    summary: `Đổi trạng thái bài wiki "${slug}" → ${status}`,
  }).catch(() => null);

  if (status === "published" && prev?.status !== "published" && prev) {
    // Award wiki points + achievements for the article author
    void (async () => {
      try {
        const { data: article } = await untypedFrom(db, "wiki_articles")
          .select("user_id").eq("slug", slug).single() as { data: { user_id: string | null } | null };
        if (article?.user_id) {
          const { count } = await untypedFrom(db, "wiki_articles")
            .select("*", { count: "exact", head: true })
            .eq("user_id", article.user_id).eq("status", "published") as { count: number | null };
          const [{ checkWikiAchievements }, { syncContributorPoints }, { createNotification }] = await Promise.all([
            import("@/lib/server/award-achievement"),
            import("@/lib/server/contributor-sync"),
            import("@/lib/server/notifications"),
          ]);
          await checkWikiAchievements(article.user_id, count ?? 1);
          await syncContributorPoints(article.user_id, prev.author_name, null, "wiki");
          await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
            .rpc("increment_user_points", { uid: article.user_id, amount: 30 });
          // In-app notification to author
          const siteUrlNotify = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
          await createNotification({
            user_id: article.user_id,
            type: "wiki_approved",
            title: "Bài Wiki của bạn đã được xuất bản! 🎉",
            body: prev.title,
            entity_type: "wiki",
            entity_id: slug,
            entity_url: `${siteUrlNotify}/wiki/${slug}`,
          }).catch(() => null);
        }
      } catch { /* non-critical */ }
    })();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    const payload = {
      title: "📖 WIKI MỚI ĐƯỢC XUẤT BẢN!",
      sections: [{
        rows: [
          { label: "📌 Tiêu đề", value: prev.title, bold: true },
          { label: "🏷 Danh mục", value: prev.category },
          { label: "✍️ Tác giả", value: prev.author_name },
        ],
      }],
      actions: [{ label: "👉 Đọc Wiki", url: `${siteUrl}/wiki/${slug}` }],
      footer: `📚 ${new URL(siteUrl).hostname}`,
    };
    void Promise.allSettled([
      import("@/lib/server/user-notify").then(({ notifyUserNewWikiArticle }) =>
        notifyUserNewWikiArticle({ slug, title: prev.title, category: prev.category, author_name: prev.author_name }, siteUrl)
      ),
      sendDiscordPublicNotification(payload, DISCORD_COLORS.info),
    ]);
  }

  return NextResponse.json({ ok: true });
}
