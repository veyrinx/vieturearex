import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCreatorByUserId, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, readJson, reasonSchema, requireMfaIfEnrolled, requireStaff } from "@/lib/server/craftland-api";
import type { CapabilityKey } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Ghi chú gắn vào bản đồ bị ẩn khi khoá creator — để mở khoá trả lại đúng
// những bản đồ đã ẩn vì lý do này, không đụng bản đồ bị ẩn vì vi phạm khác.
const SUSPEND_NOTE = "[auto] Creator bị khoá";

const ACTIONS: Record<string, { capability: CapabilityKey; sensitive: boolean }> = {
  grant_publish:       { capability: "craftland.creators.manage", sensitive: false },
  revoke_publish:      { capability: "craftland.creators.manage", sensitive: false },
  suspend:             { capability: "craftland.creators.manage", sensitive: true },
  unsuspend:           { capability: "craftland.creators.manage", sensitive: true },
  revoke_verification: { capability: "craftland.verify.decide",   sensitive: true },
};

const schema = z.object({
  action: z.enum(["grant_publish", "revoke_publish", "suspend", "unsuspend", "revoke_verification"]),
  reason: reasonSchema,
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const rule = ACTIONS[body.data.action];
  const { actor, denied } = await requireStaff(request, rule.capability, 30);
  if (denied) return denied;
  if (rule.sensitive) {
    const mfa = await requireMfaIfEnrolled();
    if (mfa) return mfa;
  }

  const { id } = await params;
  const creator = await getCreatorByUserId(id);
  if (!creator) return fail(404, "Không tìm thấy creator.");
  if (id === actor.userId) return fail(403, "Không tự xử lý hồ sơ creator của chính mình.");

  const { action, reason } = body.data;
  let patch: Record<string, unknown>;
  switch (action) {
    case "grant_publish":
      patch = { can_publish: true };
      break;
    case "revoke_publish":
      patch = { can_publish: false };
      break;
    case "suspend":
      if (creator.status === "suspended") return fail(409, "Creator đã bị khoá.");
      patch = { status: "suspended", suspended_reason: reason };
      break;
    case "unsuspend":
      if (creator.status !== "suspended") return fail(409, "Creator không bị khoá.");
      patch = { status: "active", suspended_reason: null };
      break;
    case "revoke_verification":
      if (creator.verification_status !== "verified") return fail(409, "Creator chưa được xác minh.");
      patch = { verification_status: "revoked", verified_at: null, verified_by: null };
      break;
  }

  const { error } = (await tbl("craftland_creators").update(patch as never).eq("user_id", id)) as unknown as { error: unknown };
  if (error) return fail(500, "Không cập nhật được creator.");

  let affectedMaps = 0;
  if (action === "suspend") {
    const { data } = (await tbl("craftland_maps")
      .update({ status: "hidden", moderation_note: SUSPEND_NOTE, is_featured: false, is_editor_pick: false } as never)
      .eq("creator_id", id).eq("status", "published").select("id")) as unknown as { data: unknown[] | null };
    affectedMaps = data?.length ?? 0;
  } else if (action === "unsuspend") {
    const { data } = (await tbl("craftland_maps")
      .update({ status: "published", moderation_note: null } as never)
      .eq("creator_id", id).eq("status", "hidden").eq("moderation_note", SUSPEND_NOTE).select("id")) as unknown as { data: unknown[] | null };
    affectedMaps = data?.length ?? 0;
  }

  await logCraftlandAction({
    actor, targetType: "creator", targetId: id, action, reason,
    metadata: { before: { status: creator.status, can_publish: creator.can_publish, verification: creator.verification_status }, patch, affectedMaps },
    summary: `${action} creator @${creator.username}${affectedMaps ? ` (${affectedMaps} bản đồ)` : ""}`,
    request,
  });
  return NextResponse.json({ ok: true, affectedMaps });
}
