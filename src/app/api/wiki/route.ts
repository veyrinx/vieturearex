import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { sanitizePlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { SITE_URL } from "@/lib/constants/site";

const createSchema = z.object({
  slug:      z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  title:     z.string().min(3).max(200),
  content:   z.string().min(20),
  excerpt:   z.string().max(300).optional(),
  category:  z.string().default("Tổng quan"),
  cover_url: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "wiki-list", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ articles: [] });

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q");

  let query = untypedFrom(db, "wiki_articles")
    .select("id, slug, title, excerpt, category, cover_url, author_name, view_count, edit_count, updated_at, created_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(60);

  if (category) query = query.eq("category", category) as typeof query;
  if (q)        query = query.ilike("title", `%${q}%`) as typeof query;

  const { data, error } = await query as { data: unknown[] | null; error: unknown };
  if (error) return NextResponse.json({ articles: [] });
  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "wiki-create", limit: 5, windowMs: 3_600_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Get user display_name
  const { data: profile } = await untypedFrom(db, "users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null } | null };

  const authorName = profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh";

  // Sanitize user-supplied content — this article is auto-published and rendered
  // as raw HTML on /wiki/[slug], so unsanitized input is a stored-XSS vector.
  const safeContent = sanitizeRichText(parsed.data.content);
  if (safeContent.trim().length < 20) {
    return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });
  }

  const { data: article, error } = await untypedFrom(db, "wiki_articles").insert({
    slug:        parsed.data.slug,
    title:       sanitizePlainText(parsed.data.title),
    content:     safeContent,
    excerpt:     parsed.data.excerpt ? sanitizePlainText(parsed.data.excerpt) : null,
    category:    sanitizePlainText(parsed.data.category),
    cover_url:   parsed.data.cover_url || null,
    author_id:   user.id,
    author_name: authorName,
    status:      "published",
  } as never).select("slug").single() as { data: { slug: string } | null; error: { code?: string; message?: string } | null };

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug đã tồn tại. Vui lòng chọn slug khác." }, { status: 409 });
    }
    return NextResponse.json({ error: "Không thể tạo bài wiki." }, { status: 500 });
  }

  // Upsert contributor_points: increment wiki_count + 10 points
  const { data: existing } = await untypedFrom(db, "contributor_points")
    .select("wiki_count, total_points, posts_count, replies_count")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { wiki_count: number; total_points: number; posts_count: number; replies_count: number } | null };

  await untypedFrom(db, "contributor_points").upsert({
    user_id:       user.id,
    display_name:  authorName,
    avatar_url:    null,
    posts_count:   existing?.posts_count ?? 0,
    replies_count: existing?.replies_count ?? 0,
    wiki_count:    (existing?.wiki_count ?? 0) + 1,
    total_points:  (existing?.total_points ?? 0) + 10,
    badge:         "member",
    updated_at:    new Date().toISOString(),
  } as never);

  const siteUrl = SITE_URL;

  // 1. Notify public Telegram + Discord (article is auto-published)
  void import("@/lib/server/user-notify").then(({ notifyUserNewWikiArticle }) =>
    notifyUserNewWikiArticle({
      slug: article!.slug,
      title: parsed.data.title,
      category: parsed.data.category ?? "Tổng quan",
      author_name: authorName,
    }, siteUrl)
  );

  // 2. Notify Discord public channel
  void import("@/lib/server/discord-notify").then(({ sendDiscordPublicNotification, DISCORD_COLORS }) =>
    sendDiscordPublicNotification({
      title: "📖 WIKI MỚI ĐƯỢC ĐÓNG GÓP!",
      sections: [{
        rows: [
          { label: "📌 Tiêu đề", value: parsed.data.title, bold: true },
          { label: "🏷 Danh mục", value: parsed.data.category ?? "Tổng quan" },
          { label: "✍️ Tác giả", value: authorName },
        ],
      }],
      actions: [{ label: "👉 Đọc Wiki", url: `${siteUrl}/wiki/${article!.slug}` }],
      footer: `📚 ${new URL(siteUrl).hostname}`,
    }, DISCORD_COLORS.info)
  );

  // 3. Notify admin Telegram (internal — new wiki submitted for awareness)
  void import("@/lib/server/telegram-notify").then(({ sendTelegramNotification, vnNow }) =>
    sendTelegramNotification({
      title: "📖 WIKI MỚI",
      subtitle: vnNow(),
      sections: [{
        rows: [
          { label: "Tiêu đề", value: parsed.data.title, bold: true },
          { label: "Tác giả", value: authorName },
          { label: "Danh mục", value: parsed.data.category ?? "Tổng quan" },
        ],
      }],
      actions: [{ label: "Xem Wiki", url: `${siteUrl}/wiki/${article!.slug}` }],
      footer: "📚 Arex Admin",
    })
  );

  return NextResponse.json({ slug: article!.slug }, { status: 201 });
}
