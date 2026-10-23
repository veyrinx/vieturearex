import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { tbl } from "@/lib/server/craftland";
import { fail, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, { name: "craftland-follow-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ signedIn: false, following: false, isSelf: false });
  const { data } = (await tbl("craftland_follows").select("creator_id").eq("follower_id", auth.userId).eq("creator_id", id).maybeSingle()) as unknown as { data: unknown };
  return NextResponse.json({ signedIn: true, following: !!data, isSelf: auth.userId === id });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-follow", limit: 30 });
  if (denied) return denied;
  const { id } = await params;
  if (id === actor.userId) return fail(400, "Bạn không thể tự theo dõi chính mình.");

  const { data: creator } = (await tbl("craftland_creators").select("user_id").eq("user_id", id).eq("status", "active").maybeSingle()) as unknown as { data: unknown };
  if (!creator) return fail(404, "Không tìm thấy creator.");

  const { error } = (await tbl("craftland_follows").upsert(
    { follower_id: actor.userId, creator_id: id } as never,
    { onConflict: "follower_id,creator_id", ignoreDuplicates: true },
  )) as unknown as { error: { message: string } | null };
  if (error) return fail(500, "Không theo dõi được, thử lại sau.");
  return NextResponse.json({ following: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-follow", limit: 30 });
  if (denied) return denied;
  const { id } = await params;
  const { error } = (await tbl("craftland_follows").delete().eq("follower_id", actor.userId).eq("creator_id", id)) as unknown as { error: { message: string } | null };
  if (error) return fail(500, "Không bỏ theo dõi được.");
  return NextResponse.json({ following: false });
}
