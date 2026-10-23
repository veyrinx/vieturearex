import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { tbl } from "@/lib/server/craftland";
import { fail, readJson, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({
  read: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, { name: "craftland-academy", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ signedIn: false, read: false, bookmarked: false });
  const { id } = await params;
  const { data } = (await tbl("craftland_academy_progress").select("read_at, bookmarked").eq("user_id", auth.userId).eq("article_id", id).maybeSingle()) as unknown as {
    data: { read_at: string | null; bookmarked: boolean } | null;
  };
  return NextResponse.json({ signedIn: true, read: !!data?.read_at, bookmarked: !!data?.bookmarked });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-academy-write", limit: 30 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const { id } = await params;

  const { data: article } = (await tbl("craftland_academy_articles").select("id").eq("id", id).eq("status", "published").maybeSingle()) as unknown as { data: unknown };
  if (!article) return fail(404, "Không tìm thấy bài viết.");

  const { data: current } = (await tbl("craftland_academy_progress").select("read_at, bookmarked").eq("user_id", actor.userId).eq("article_id", id).maybeSingle()) as unknown as {
    data: { read_at: string | null; bookmarked: boolean } | null;
  };
  const next = {
    user_id: actor.userId,
    article_id: id,
    read_at: body.data.read === undefined ? current?.read_at ?? null : body.data.read ? current?.read_at ?? new Date().toISOString() : null,
    bookmarked: body.data.bookmarked ?? current?.bookmarked ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = (await tbl("craftland_academy_progress").upsert(next as never, { onConflict: "user_id,article_id" })) as unknown as { error: unknown };
  if (error) return fail(500, "Không lưu được tiến độ.");
  return NextResponse.json({ read: !!next.read_at, bookmarked: next.bookmarked });
}
