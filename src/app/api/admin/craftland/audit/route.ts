import { NextRequest, NextResponse } from "next/server";
import { tbl } from "@/lib/server/craftland";
import { fail, requireStaff } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const TARGETS = new Set(["map", "creator", "verification", "report", "category", "academy"]);

/** Lịch sử thao tác (append-only) của một đối tượng Craftland. */
export async function GET(request: NextRequest) {
  const { denied } = await requireStaff(request, "craftland.moderate");
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  const type = sp.get("target_type") ?? "";
  const id = sp.get("target_id") ?? "";
  if (!TARGETS.has(type) || !id || id.length > 64) return fail(400, "Thiếu đối tượng.");

  const { data } = (await tbl("craftland_moderation_actions")
    .select("id, actor_email, action, reason, outcome, metadata, created_at")
    .eq("target_type", type)
    .eq("target_id", id)
    .order("created_at", { ascending: false })
    .limit(100)) as unknown as { data: unknown[] | null };
  return NextResponse.json({ entries: data ?? [] });
}
