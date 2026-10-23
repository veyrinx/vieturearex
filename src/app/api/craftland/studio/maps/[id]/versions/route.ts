import { NextRequest, NextResponse } from "next/server";
import { tbl } from "@/lib/server/craftland";
import { fail, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

/** Lịch sử phiên bản + phản hồi kiểm duyệt của bản đồ thuộc chính creator. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio", limit: 60 });
  if (denied) return denied;
  const { id } = await params;

  const { data: map } = (await tbl("craftland_maps").select("id").eq("id", id).eq("creator_id", actor.userId).maybeSingle()) as unknown as { data: unknown };
  if (!map) return fail(404, "Không tìm thấy bản đồ.");

  const [versions, history] = await Promise.all([
    tbl("craftland_map_versions").select("id, version, note, created_at, snapshot").eq("map_id", id)
      .order("version", { ascending: false }).limit(50) as unknown as Promise<{ data: unknown[] | null }>,
    // Chỉ trả hành động + lý do; không trả email/IP của kiểm duyệt viên cho creator.
    tbl("craftland_moderation_actions").select("action, reason, created_at, metadata").eq("target_type", "map").eq("target_id", id)
      .order("created_at", { ascending: false }).limit(50) as unknown as Promise<{ data: unknown[] | null }>,
  ]);

  return NextResponse.json({ versions: versions.data ?? [], history: history.data ?? [] });
}
