import { NextRequest, NextResponse } from "next/server";
import { tbl } from "@/lib/server/craftland";
import { fail, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

async function isPublished(id: string) {
  const { data } = (await tbl("craftland_maps").select("id").eq("id", id).eq("status", "published").maybeSingle()) as unknown as { data: { id: string } | null };
  return !!data;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-favorite", limit: 30 });
  if (denied) return denied;
  const { id } = await params;
  if (!(await isPublished(id))) return fail(404, "Không tìm thấy bản đồ.");

  const { error } = (await tbl("craftland_favorites")
    .upsert({ user_id: actor.userId, map_id: id } as never, { onConflict: "user_id,map_id", ignoreDuplicates: true })) as unknown as { error: { message: string } | null };
  if (error) return fail(500, "Không lưu được bản đồ, thử lại sau.");
  return NextResponse.json({ favorited: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-favorite", limit: 30 });
  if (denied) return denied;
  const { id } = await params;
  const { error } = (await tbl("craftland_favorites").delete().eq("user_id", actor.userId).eq("map_id", id)) as unknown as { error: { message: string } | null };
  if (error) return fail(500, "Không bỏ lưu được, thử lại sau.");
  return NextResponse.json({ favorited: false });
}
