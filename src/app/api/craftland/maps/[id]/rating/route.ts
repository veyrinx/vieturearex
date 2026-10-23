import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tbl } from "@/lib/server/craftland";
import { fail, readJson, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({ score: z.number().int().min(1).max(5) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-rating", limit: 20 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const { id } = await params;

  const { data: map } = (await tbl("craftland_maps").select("creator_id, status").eq("id", id).maybeSingle()) as unknown as {
    data: { creator_id: string; status: string } | null;
  };
  if (!map || map.status !== "published") return fail(404, "Không tìm thấy bản đồ.");
  if (map.creator_id === actor.userId) return fail(403, "Bạn không thể tự đánh giá bản đồ của mình.");

  const { error } = (await tbl("craftland_ratings").upsert(
    { user_id: actor.userId, map_id: id, score: body.data.score, updated_at: new Date().toISOString() } as never,
    { onConflict: "user_id,map_id" },
  )) as unknown as { error: { message: string } | null };
  if (error) return fail(500, "Không lưu được đánh giá.");

  const { data: fresh } = (await tbl("craftland_maps").select("rating_count, rating_sum").eq("id", id).maybeSingle()) as unknown as {
    data: { rating_count: number; rating_sum: number } | null;
  };
  return NextResponse.json({ rating: body.data.score, rating_count: fresh?.rating_count ?? 0, rating_sum: fresh?.rating_sum ?? 0 });
}
