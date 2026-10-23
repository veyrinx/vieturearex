import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText, getCreatorByUserId, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, linkListSchema, readJson, requireMember } from "@/lib/server/craftland-api";
import type { CraftlandVerificationRequest } from "@/lib/types/craftland";

export const dynamic = "force-dynamic";

const schema = z.object({
  display_name: z.string().trim().min(2).max(60),
  about: z.string().trim().min(20, "Giới thiệu ít nhất 20 ký tự.").max(2000),
  public_links: linkListSchema.refine((l) => l.length >= 1, "Cần ít nhất một liên kết công khai."),
  evidence: z.string().trim().min(20, "Mô tả bằng chứng ít nhất 20 ký tự.").max(3000),
});

async function openRequest(creatorId: string) {
  const { data } = (await tbl("craftland_verification_requests")
    .select("*")
    .eq("creator_id", creatorId)
    .in("status", ["pending", "needs_info"])
    .maybeSingle()) as unknown as { data: CraftlandVerificationRequest | null };
  return data;
}

export async function GET(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio", limit: 60 });
  if (denied) return denied;
  // review_notes là ghi chú nội bộ của admin — không trả cho creator.
  const { data } = (await tbl("craftland_verification_requests")
    .select("id, display_name, about, public_links, evidence, status, decided_at, decision_reason, created_at, updated_at")
    .eq("creator_id", actor.userId)
    .order("created_at", { ascending: false })
    .limit(20)) as unknown as { data: unknown[] | null };
  return NextResponse.json({ requests: data ?? [] });
}

/** Gửi yêu cầu mới, hoặc bổ sung thông tin cho yêu cầu đang ở "needs_info". */
export async function POST(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-verify-submit", limit: 5 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;

  const creator = await getCreatorByUserId(actor.userId);
  if (!creator) return fail(403, "Hãy tạo hồ sơ creator trước.");
  if (creator.status !== "active") return fail(403, "Hồ sơ creator đang bị khoá.");
  if (creator.verification_status === "verified") return fail(409, "Hồ sơ đã được xác minh.");

  const payload = {
    display_name: cleanText(body.data.display_name),
    about: cleanText(body.data.about),
    public_links: body.data.public_links,
    evidence: cleanText(body.data.evidence),
  };

  const current = await openRequest(actor.userId);
  if (current?.status === "pending") return fail(409, "Bạn đã có yêu cầu đang chờ xét duyệt.");

  let requestId: string;
  if (current?.status === "needs_info") {
    const { error } = (await tbl("craftland_verification_requests")
      .update({ ...payload, status: "pending" } as never)
      .eq("id", current.id)) as unknown as { error: unknown };
    if (error) return fail(500, "Không cập nhật được yêu cầu.");
    requestId = current.id;
  } else {
    const { data, error } = (await tbl("craftland_verification_requests")
      .insert({ ...payload, creator_id: actor.userId } as never)
      .select("id")
      .single()) as unknown as { data: { id: string } | null; error: { code?: string } | null };
    if (error?.code === "23505") return fail(409, "Bạn đã có yêu cầu đang mở.");
    if (error || !data) return fail(500, "Không gửi được yêu cầu.");
    requestId = data.id;
  }

  await tbl("craftland_creators").update({ verification_status: "pending" } as never).eq("user_id", actor.userId);
  await logCraftlandAction({
    actor,
    targetType: "verification",
    targetId: requestId,
    action: current ? "verification_resubmitted" : "verification_submitted",
    summary: `Creator ${creator.username} gửi yêu cầu xác minh`,
    request,
    staffAction: false,
  });

  return NextResponse.json({ ok: true, id: requestId }, { status: 201 });
}

/** Rút yêu cầu đang mở. */
export async function DELETE(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-verify-submit", limit: 5 });
  if (denied) return denied;
  const current = await openRequest(actor.userId);
  if (!current) return fail(404, "Không có yêu cầu nào đang mở.");

  await tbl("craftland_verification_requests").update({ status: "withdrawn" } as never).eq("id", current.id);
  await tbl("craftland_creators").update({ verification_status: "none" } as never).eq("user_id", actor.userId).eq("verification_status", "pending");
  await logCraftlandAction({
    actor, targetType: "verification", targetId: current.id, action: "verification_withdrawn",
    summary: "Creator rút yêu cầu xác minh", request, staffAction: false,
  });
  return NextResponse.json({ ok: true });
}
