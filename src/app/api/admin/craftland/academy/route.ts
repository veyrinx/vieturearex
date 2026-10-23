import { NextRequest, NextResponse } from "next/server";
import { cleanText, logCraftlandAction, slugify, tbl } from "@/lib/server/craftland";
import { fail, readJson, requireStaff } from "@/lib/server/craftland-api";
import { academyArticleSchema, prepareAcademyBody } from "@/lib/server/craftland-academy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { actor, denied } = await requireStaff(request, "craftland.content", 20);
  if (denied) return denied;
  const body = await readJson(request, academyArticleSchema);
  if ("error" in body) return body.error;
  const a = body.data;

  const { html, text } = prepareAcademyBody(a.body);
  const auto = a.slug || slugify(a.title);
  const slug = auto === "api" ? "api-huong-dan" : auto;
  const row = {
    slug,
    category_slug: a.category_slug,
    title: cleanText(a.title),
    excerpt: cleanText(a.excerpt),
    body: html,
    body_text: text,
    platform: a.platform,
    sources: a.sources,
    compat_warning: a.compat_warning ? cleanText(a.compat_warning) : null,
    sort_order: a.sort_order,
    status: a.status,
    author_id: actor.userId,
    published_at: a.status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = (await tbl("craftland_academy_articles").insert(row as never).select("id").single()) as unknown as {
    data: { id: string } | null; error: { code?: string } | null;
  };
  if (error?.code === "23505") return fail(409, "Slug này đã được dùng.");
  if (error || !data) return fail(400, "Không tạo được bài viết.");

  await logCraftlandAction({
    actor, targetType: "academy", targetId: data.id, action: "academy_create",
    metadata: { slug, status: a.status }, summary: `Tạo bài Academy "${row.title}"`, request,
  });
  return NextResponse.json({ id: data.id, slug }, { status: 201 });
}
