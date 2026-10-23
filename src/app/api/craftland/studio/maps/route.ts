import { NextRequest, NextResponse } from "next/server";
import { getCreatorByUserId, slugify, tbl, cleanText } from "@/lib/server/craftland";
import { fail, mapInputSchema, readJson, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio", limit: 60 });
  if (denied) return denied;
  const { data } = (await tbl("craftland_maps")
    .select("*")
    .eq("creator_id", actor.userId)
    .order("updated_at", { ascending: false })
    .limit(500)) as unknown as { data: unknown[] | null };
  return NextResponse.json({ maps: data ?? [] });
}

/** Tạo bản đồ mới ở trạng thái bản nháp. */
export async function POST(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio-write", limit: 10 });
  if (denied) return denied;

  const creator = await getCreatorByUserId(actor.userId);
  if (!creator) return fail(403, "Hãy tạo hồ sơ creator trước khi đăng bản đồ.");
  if (creator.status !== "active") return fail(403, "Hồ sơ creator đang bị khoá.");
  if (!creator.can_publish) return fail(403, "Tài khoản của bạn đang bị tạm dừng quyền đăng bản đồ.");

  const body = await readJson(request, mapInputSchema);
  if ("error" in body) return body.error;
  const input = body.data;

  const base = slugify(input.title) || "ban-do";
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  const row = {
    slug,
    creator_id: actor.userId,
    title: cleanText(input.title),
    summary: cleanText(input.summary),
    description: cleanText(input.description),
    category_slug: input.category_slug,
    tags: Array.from(new Set(input.tags)),
    map_code: input.map_code,
    platforms: input.platforms,
    cover_url: input.cover_url,
    gallery: input.gallery,
    video_url: input.video_url,
    how_to_play: cleanText(input.how_to_play),
    status: "draft",
  };

  const { data, error } = (await tbl("craftland_maps").insert(row as never).select("*").single()) as unknown as {
    data: { id: string } | null;
    error: { code?: string; message: string } | null;
  };
  if (error?.code === "23503") return fail(400, "Thể loại không tồn tại.");
  if (error || !data) return fail(400, "Không tạo được bản đồ. Kiểm tra lại thông tin.");

  await tbl("craftland_map_versions").insert({
    map_id: data.id,
    version: 1,
    snapshot: row,
    editor_id: actor.userId,
    note: "Tạo bản nháp",
  } as never);

  return NextResponse.json({ map: data }, { status: 201 });
}
