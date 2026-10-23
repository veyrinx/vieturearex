import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, readJson, requireStaff } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["resolve", "dismiss", "reopen"]),
  note: z.string().trim().min(3, "Ghi chú xử lý ít nhất 3 ký tự.").max(1000),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireStaff(request, "craftland.moderate");
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const { id } = await params;

  const { data: report } = (await tbl("craftland_reports").select("id, status, map_id, reason").eq("id", id).maybeSingle()) as unknown as {
    data: { id: string; status: string; map_id: string; reason: string } | null;
  };
  if (!report) return fail(404, "Không tìm thấy báo cáo.");

  const status = body.data.action === "resolve" ? "resolved" : body.data.action === "dismiss" ? "dismissed" : "open";
  if (status === report.status) return fail(409, "Báo cáo đã ở trạng thái này.");

  const { error } = (await tbl("craftland_reports").update({
    status,
    handled_by: status === "open" ? null : actor.userId,
    handled_at: status === "open" ? null : new Date().toISOString(),
    resolution_note: cleanText(body.data.note),
  } as never).eq("id", id)) as unknown as { error: unknown };
  if (error) return fail(500, "Không cập nhật được báo cáo.");

  await logCraftlandAction({
    actor, targetType: "report", targetId: id, action: `report_${body.data.action}`, reason: body.data.note,
    metadata: { map_id: report.map_id, from: report.status, to: status, reason: report.reason },
    summary: `Báo cáo bản đồ (${report.reason}) → ${status}`, request,
  });
  return NextResponse.json({ ok: true, status });
}
