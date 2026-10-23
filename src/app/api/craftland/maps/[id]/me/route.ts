import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { tbl } from "@/lib/server/craftland";

export const dynamic = "force-dynamic";

/** Trạng thái của người đang xem với một bản đồ: đã lưu chưa, đã chấm mấy sao. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, { name: "craftland-me", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ signedIn: false, favorited: false, rating: null, isOwner: false });

  const [fav, rating, map] = await Promise.all([
    tbl("craftland_favorites").select("map_id").eq("user_id", auth.userId).eq("map_id", id).maybeSingle() as unknown as Promise<{ data: unknown }>,
    tbl("craftland_ratings").select("score").eq("user_id", auth.userId).eq("map_id", id).maybeSingle() as unknown as Promise<{ data: { score: number } | null }>,
    tbl("craftland_maps").select("creator_id").eq("id", id).maybeSingle() as unknown as Promise<{ data: { creator_id: string } | null }>,
  ]);

  return NextResponse.json({
    signedIn: true,
    favorited: !!fav.data,
    rating: rating.data?.score ?? null,
    isOwner: map.data?.creator_id === auth.userId,
  });
}
