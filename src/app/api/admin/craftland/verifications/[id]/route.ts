import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, readJson, requireMfaIfEnrolled, requireStaff } from "@/lib/server/craftland-api";
import type { CraftlandVerificationRequest } from "@/lib/types/craftland";

export const dynamic = "force-dynamic";

/**
 * Quy trình xác minh creator:
 *   note, request_info  — người có craftland.verify.review (admin kiểm tra hồ sơ)
 *   approve, reject     — người có craftland.verify.decide (mặc định chỉ Super Admin)
 */
const schema = z.object({
  action: z.enum(["note", "request_info", "approve", "reject"]),
  message: z.string().trim().min(5, "Nội dung ít nhất 5 ký tự.").max(2000),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const { action, message } = body.data;
  const decides = action === "approve" || action === "reject";

  const { actor, denied } = await requireStaff(request, decides ? "craftland.verify.decide" : "craftland.verify.review", 30);
  if (denied) return denied;
  if (decides) {
    const mfa = await requireMfaIfEnrolled();
    if (mfa) return mfa;
  }

  const { id } = await params;
  const { data: req } = (await tbl("craftland_verification_requests").select("*").eq("id", id).maybeSingle()) as unknown as {
    data: CraftlandVerificationRequest | null;
  };
  if (!req) return fail(404, "Không tìm thấy yêu cầu.");
  if (req.creator_id === actor.userId) return fail(403, "Không tự duyệt yêu cầu của chính mình.");
  if (!["pending", "needs_info"].includes(req.status)) return fail(409, "Yêu cầu đã được xử lý xong.");

  const text = cleanText(message);
  const now = new Date().toISOString();

  if (action === "note") {
    const line = `[${now.slice(0, 16).replace("T", " ")}] ${actor.email ?? actor.userId}: ${text}`;
    const notes = req.review_notes ? `${req.review_notes}\n${line}` : line;
    await tbl("craftland_verification_requests").update({ review_notes: notes.slice(-8000) } as never).eq("id", id);
  } else if (action === "request_info") {
    if (req.status !== "pending") return fail(409, "Yêu cầu đang chờ creator bổ sung.");
    await tbl("craftland_verification_requests").update({ status: "needs_info", decision_reason: text } as never).eq("id", id);
  } else {
    const approved = action === "approve";
    const { data: updated } = (await tbl("craftland_verification_requests")
      .update({ status: approved ? "approved" : "rejected", decided_by: actor.userId, decided_at: now, decision_reason: text } as never)
      .eq("id", id)
      .in("status", ["pending", "needs_info"])
      .select("id")) as unknown as { data: unknown[] | null };
    if (!updated?.length) return fail(409, "Yêu cầu vừa được người khác xử lý.");

    await tbl("craftland_creators").update(
      (approved
        ? { verification_status: "verified", verified_at: now, verified_by: actor.userId, display_name: req.display_name }
        : { verification_status: "rejected" }) as never,
    ).eq("user_id", req.creator_id);
  }

  await logCraftlandAction({
    actor, targetType: "verification", targetId: id, action: `verification_${action}`, reason: text,
    metadata: { creator_id: req.creator_id, from: req.status },
    summary: `Xác minh creator: ${action} (${req.display_name})`, request,
  });
  return NextResponse.json({ ok: true });
}
