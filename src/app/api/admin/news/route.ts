import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { newsSchema } from "@/lib/validators/news";
import {
  createNews,
  deleteNews,
  getNewsAdmin,
  updateNews,
} from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { sendPushNotification } from "@/lib/server/push-notify";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";

async function getAdminName(): Promise<string> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return "Admin";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Admin";
  const { data: profile } = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle() as { data: { display_name: string | null } | null };
  return profile?.display_name || user.email?.split("@")[0] || "Admin";
}

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildExcerpt(title: string, excerpt?: string) {
  const normalizedExcerpt = sanitizePlainText(excerpt ?? "");
  return normalizedExcerpt || `${title} - Cập nhật tin tức mới.`;
}

function buildContent(title: string, content?: string) {
  const normalizedContent = sanitizeRichText(content ?? "");
  return normalizedContent || `<p>${title}</p>`;
}

function notifyNewsChange(
  article: { title: string; slug: string; category?: string | null; excerpt?: string | null },
  action: "created" | "updated",
  adminName: string,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
  const articleUrl = `${siteUrl}/news/${article.slug}`;

  const payload = {
    title: action === "created" ? "📰 Bài viết mới được đăng" : "✏️ Bài viết đã được cập nhật",
    subtitle: vnNow(),
    sections: [
      {
        icon: action === "created" ? "🆕" : "🔄",
        heading: article.title,
        rows: [
          ...(article.category ? [{ label: "Danh mục", value: article.category }] : []),
          { label: action === "created" ? "Đăng bởi" : "Cập nhật bởi", value: adminName },
        ],
      },
    ],
    actions: [{ label: "Xem bài viết", url: articleUrl }],
    footer: "🤖 Arex Admin",
  };

  const color = action === "created" ? DISCORD_COLORS.info : DISCORD_COLORS.warn;

  void Promise.allSettled([
    sendTelegramNotification(payload),
    sendDiscordInternalNotification(payload, color),
    sendLarkNotification(payload, "main"),
    // Public channels — chỉ khi tạo mới
    ...(action === "created" ? [
      sendUserTelegramNotification(payload),
      sendDiscordPublicNotification(payload, DISCORD_COLORS.info),
    ] : []),
  ]);
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 80, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }
  try {
    const news = await getNewsAdmin();
    return NextResponse.json({ news });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load news.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "news.create" });
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const parsed = newsSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid news payload." }, { status: 400 });
    }

    const title = sanitizePlainText(parsed.data.title);
    const slug = parsed.data.slug?.trim() ? parsed.data.slug : createSlug(title);

    const adminName = await getAdminName();
    const article = await createNews({
      ...parsed.data,
      title,
      slug,
      excerpt: buildExcerpt(title, parsed.data.excerpt),
      content: buildContent(title, parsed.data.content),
      category: sanitizePlainText(parsed.data.category ?? "ESPORTS"),
      created_at: parsed.data.created_at ?? new Date().toISOString(),
      status: parsed.data.status ?? "published",
      created_by_name: adminName,
    });
    await logAdminActivity({
      action: "NEWS_CREATED",
      targetType: "NEWS",
      targetId: article.id,
      summary: `Tạo bài viết ${article.title}`,
    });

    notifyNewsChange(article, "created", adminName);

    // Gửi push notification + Telegram user cho subscribers
    void sendPushNotification("📰 Tin tức mới", article.title, `/news/${article.slug}`).catch(() => null);
    import("@/lib/server/user-notify").then(({ notifyUserNewArticle }) => {
      notifyUserNewArticle(article, process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site");
    });
    revalidatePath("/news", "layout");
    revalidatePath("/", "layout");

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create news.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "news.edit" });
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const parsed = newsSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: "Invalid news payload." }, { status: 400 });
    }

    const title = sanitizePlainText(parsed.data.title);
    const slug = parsed.data.slug?.trim() ? parsed.data.slug : createSlug(title);

    const adminName = await getAdminName();
    const article = await updateNews(parsed.data.id, {
      ...parsed.data,
      title,
      slug,
      excerpt: buildExcerpt(title, parsed.data.excerpt),
      content: buildContent(title, parsed.data.content),
      category: sanitizePlainText(parsed.data.category ?? "ESPORTS"),
      created_at: parsed.data.created_at ?? new Date().toISOString(),
      status: parsed.data.status ?? "published",
    });
    await logAdminActivity({
      action: "NEWS_UPDATED",
      targetType: "NEWS",
      targetId: article.id,
      summary: `Cập nhật bài viết ${article.title}`,
    });

    notifyNewsChange(article, "updated", adminName);

    revalidatePath("/news", "layout");
    revalidatePath(`/news/${article.slug}`, "page");
    revalidatePath("/", "layout");
    return NextResponse.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update news.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "news.delete" });
  if (denied) {
    return denied;
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "Missing news id." }, { status: 400 });
  }

  await deleteNews(payload.id);
  await logAdminActivity({
    action: "NEWS_DELETED",
    targetType: "NEWS",
    targetId: payload.id,
    summary: "Xóa bài viết",
  });
  revalidatePath("/news", "layout");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
