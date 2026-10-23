import { NextRequest, NextResponse } from "next/server";
import { cleanText, logCraftlandAction, slugify, tbl } from "@/lib/server/craftland";
import { fail, readJson, requireStaff } from "@/lib/server/craftland-api";
import { academyArticleSchema, prepareAcademyBody } from "@/lib/server/craftland-academy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireStaff(request, "craftland.content");
  if (denied) return denied;
  const { id } = await params;
  const { data } = (await tbl("craftland_academy_articles").select("*").eq("id", id).maybeSingle()) as unknown as { data: unknown };
  if (!data) return fail(404, "Không tìm thấy bài viết.");
  return NextResponse.json({ article: data });
}

/** Cập nhật bài. Không có xoá cứng — đổi status sang "archived". */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireStaff(request, "craftland.content", 30);
  if (denied) return denied;
  const body = await readJson(request, academyArticleSchema);
  if ("error" in body) return body.error;
  const { id } = await params;

  const { data: current } = (await tbl("craftland_academy_articles").select("id, status, published_at, title").eq("id", id).maybeSingle()) as unknown as {
    data: { id: string; status: string; published_at: string | null; title: string } | null;
  };
  if (!current) return fail(404, "Không tìm thấy bài viết.");

  const a = body.data;
  const { html, text } = prepareAcademyBody(a.body);
  const row = {
    slug: (a.slug || slugify(a.title)) === "api" ? "api-huong-dan" : a.slug || slugify(a.title),
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
    published_at: a.status === "published" ? current.published_at ?? new Date().toISOString() : current.published_at,
  };

  const { error } = (await tbl("craftland_academy_articles").update(row as never).eq("id", id)) as unknown as { error: { code?: string } | null };
  if (error?.code === "23505") return fail(409, "Slug này đã được dùng.");
  if (error) return fail(400, "Không lưu được bài viết.");

  await logCraftlandAction({
    actor, targetType: "academy", targetId: id, action: "academy_update",
    metadata: { from: current.status, to: a.status }, summary: `Cập nhật bài Academy "${row.title}"`, request,
  });
  return NextResponse.json({ ok: true, slug: row.slug });
}
