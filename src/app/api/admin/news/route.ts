import { NextRequest, NextResponse } from "next/server";
import { newsSchema } from "@/lib/validators/news";
import {
  createNews,
  deleteNews,
  getNews,
  updateNews,
} from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { sendPushNotification } from "@/lib/server/push-notify";

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

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 80, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }
  const news = await getNews("all");
  return NextResponse.json({ news });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-news", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
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

    const article = await createNews({
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
      action: "NEWS_CREATED",
      targetType: "NEWS",
      targetId: article.id,
      summary: `Tạo bài viết ${article.title}`,
    });

    // Gửi push notification cho subscribers
    void sendPushNotification("📰 Tin tức mới", article.title, `/news/${article.slug}`).catch(() => null);

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
  const denied = await enforceAdminApiAuth();
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
  const denied = await enforceAdminApiAuth();
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
  return NextResponse.json({ ok: true });
}
