import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tbl, cleanText } from "@/lib/server/craftland";
import { fail, readJson, requireMember } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.enum(["wrong_info", "wrong_code", "duplicate", "stolen", "inappropriate", "other"]),
  details: z.string().trim().max(2000).default(""),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-report", limit: 5 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  if (body.data.reason === "other" && body.data.details.length < 10) {
    return fail(400, "Hãy mô tả vấn đề (ít nhất 10 ký tự).");
  }
  const { id } = await params;

  const { data: map } = (await tbl("craftland_maps").select("status").eq("id", id).maybeSingle()) as unknown as { data: { status: string } | null };
  if (!map || map.status !== "published") return fail(404, "Không tìm thấy bản đồ.");

  const { error } = (await tbl("craftland_reports").insert({
    map_id: id,
    reporter_id: actor.userId,
    reason: body.data.reason,
    details: cleanText(body.data.details),
  } as never)) as unknown as { error: { code?: string; message: string } | null };

  if (error?.code === "23505") return fail(409, "Bạn đã báo cáo bản đồ này, đội kiểm duyệt đang xử lý.");
  if (error) return fail(500, "Không gửi được báo cáo.");
  return NextResponse.json({ ok: true }, { status: 201 });
}
