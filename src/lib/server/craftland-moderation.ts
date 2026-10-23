import "server-only";
import type { NextRequest } from "next/server";
import { logCraftlandAction, tbl, type CraftlandActor } from "@/lib/server/craftland";
import type { CapabilityKey } from "@/lib/permissions";
import type { CraftlandMap, CraftlandMapStatus } from "@/lib/types/craftland";

/**
 * Thao tác kiểm duyệt bản đồ. Dùng chung cho thao tác đơn lẻ và hàng loạt để
 * cùng một luật chuyển trạng thái, cùng một kiểu ghi nhật ký.
 */

export const MAP_ACTIONS = {
  approve:            { capability: "craftland.moderate", from: ["pending"],                        to: "published", reason: false, sensitive: false },
  reject:             { capability: "craftland.moderate", from: ["pending"],                        to: "rejected",  reason: true,  sensitive: false },
  hide:               { capability: "craftland.moderate", from: ["published"],                      to: "hidden",    reason: true,  sensitive: false },
  restore:            { capability: "craftland.moderate", from: ["hidden"],                         to: "published", reason: true,  sensitive: false },
  remove:             { capability: "craftland.moderate", from: ["draft", "pending", "published", "rejected", "hidden", "archived"], to: "removed", reason: true, sensitive: true },
  unremove:           { capability: "craftland.moderate", from: ["removed"],                        to: "hidden",    reason: true,  sensitive: true },
  verify_platforms:   { capability: "craftland.moderate", from: null, to: null, reason: false, sensitive: false },
  unverify_platforms: { capability: "craftland.moderate", from: null, to: null, reason: false, sensitive: false },
  feature:            { capability: "craftland.content",  from: ["published"], to: null, reason: false, sensitive: false },
  unfeature:          { capability: "craftland.content",  from: null, to: null, reason: false, sensitive: false },
  pick:               { capability: "craftland.content",  from: ["published"], to: null, reason: false, sensitive: false },
  unpick:             { capability: "craftland.content",  from: null, to: null, reason: false, sensitive: false },
} as const satisfies Record<string, {
  capability: CapabilityKey;
  from: readonly CraftlandMapStatus[] | null;
  to: CraftlandMapStatus | null;
  reason: boolean;
  sensitive: boolean;
}>;

export type MapAction = keyof typeof MAP_ACTIONS;

export type ModerationResult = { ok: true; map: CraftlandMap } | { ok: false; status: number; error: string };

export async function moderateMap(input: {
  actor: CraftlandActor;
  mapId: string;
  action: MapAction;
  reason?: string | null;
  featuredRank?: number;
  request?: NextRequest;
}): Promise<ModerationResult> {
  const rule = MAP_ACTIONS[input.action];
  if (!input.actor.can(rule.capability)) return { ok: false, status: 403, error: "Bạn không có quyền thực hiện thao tác này." };
  if (rule.reason && (input.reason ?? "").trim().length < 5) return { ok: false, status: 400, error: "Hãy ghi lý do (ít nhất 5 ký tự)." };

  const { data: map } = (await tbl("craftland_maps").select("*").eq("id", input.mapId).maybeSingle()) as unknown as { data: CraftlandMap | null };
  if (!map) return { ok: false, status: 404, error: "Không tìm thấy bản đồ." };
  if (rule.from && !(rule.from as readonly string[]).includes(map.status)) {
    return { ok: false, status: 409, error: `Không thể "${input.action}" bản đồ đang ở trạng thái ${map.status}.` };
  }

  const patch: Record<string, unknown> = {};
  if (rule.to) {
    patch.status = rule.to;
    patch.moderation_note = input.reason?.trim() || null;
    if (rule.to === "published" && !map.published_at) patch.published_at = new Date().toISOString();
    if (rule.to !== "published") {
      patch.is_featured = false;
      patch.is_editor_pick = false;
    }
  }
  switch (input.action) {
    case "verify_platforms":   patch.platforms_verified = true; break;
    case "unverify_platforms": patch.platforms_verified = false; break;
    case "feature":            patch.is_featured = true; patch.featured_rank = input.featuredRank ?? 0; break;
    case "unfeature":          patch.is_featured = false; break;
    case "pick":               patch.is_editor_pick = true; break;
    case "unpick":             patch.is_editor_pick = false; break;
    default: break;
  }

  // Điều kiện status trong chính câu UPDATE: hai kiểm duyệt viên bấm cùng lúc
  // thì người sau nhận 409 thay vì ghi đè quyết định của người trước.
  const { data: updated, error } = (await tbl("craftland_maps")
    .update(patch as never)
    .eq("id", map.id)
    .eq("status", map.status)
    .select("*")
    .maybeSingle()) as unknown as { data: CraftlandMap | null; error: { message: string } | null };

  if (error || !updated) {
    await logCraftlandAction({
      actor: input.actor, targetType: "map", targetId: map.id, action: input.action, reason: input.reason,
      outcome: "failure", metadata: { from: map.status, error: error?.message ?? "conflict" },
      summary: `Thất bại: ${input.action} bản đồ "${map.title}"`, request: input.request,
    });
    return { ok: false, status: 409, error: "Bản đồ vừa được người khác cập nhật. Tải lại rồi thử lại." };
  }

  await logCraftlandAction({
    actor: input.actor,
    targetType: "map",
    targetId: map.id,
    action: input.action,
    reason: input.reason,
    metadata: { from: map.status, to: updated.status, patch },
    summary: `${input.action} bản đồ "${map.title}" (${map.status} → ${updated.status})`,
    request: input.request,
  });
  return { ok: true, map: updated };
}

/** Kiểm duyệt viên sửa thông tin bản đồ — lưu trước/sau vào nhật ký + phiên bản mới. */
export async function editMapAsStaff(input: {
  actor: CraftlandActor;
  mapId: string;
  fields: Partial<Pick<CraftlandMap, "title" | "summary" | "description" | "category_slug" | "tags" | "map_code" | "how_to_play" | "cover_url" | "video_url">>;
  reason: string;
  request?: NextRequest;
}): Promise<ModerationResult> {
  if (!input.actor.can("craftland.moderate")) return { ok: false, status: 403, error: "Bạn không có quyền sửa bản đồ." };
  const { data: map } = (await tbl("craftland_maps").select("*").eq("id", input.mapId).maybeSingle()) as unknown as { data: CraftlandMap | null };
  if (!map) return { ok: false, status: 404, error: "Không tìm thấy bản đồ." };

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input.fields)) {
    const prev = (map as Record<string, unknown>)[k];
    if (JSON.stringify(prev) !== JSON.stringify(v)) {
      before[k] = prev;
      after[k] = v;
    }
  }
  if (Object.keys(after).length === 0) return { ok: true, map };

  const { data: updated, error } = (await tbl("craftland_maps")
    .update({ ...after, version: map.version + 1 } as never)
    .eq("id", map.id)
    .select("*")
    .single()) as unknown as { data: CraftlandMap | null; error: { message: string } | null };
  if (error || !updated) return { ok: false, status: 400, error: "Không lưu được thay đổi." };

  await tbl("craftland_map_versions").insert({
    map_id: map.id, version: updated.version, snapshot: after, editor_id: input.actor.userId,
    note: `Kiểm duyệt viên sửa: ${input.reason}`,
  } as never);
  await logCraftlandAction({
    actor: input.actor, targetType: "map", targetId: map.id, action: "staff_edit", reason: input.reason,
    metadata: { before, after }, summary: `Sửa thông tin bản đồ "${map.title}": ${Object.keys(after).join(", ")}`,
    request: input.request,
  });
  return { ok: true, map: updated };
}
