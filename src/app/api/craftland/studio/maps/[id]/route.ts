import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText, getCreatorByUserId, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, mapInputSchema, readJson, requireMember } from "@/lib/server/craftland-api";
import type { CraftlandMap, CraftlandMapStatus } from "@/lib/types/craftland";

export const dynamic = "force-dynamic";

/**
 * Creator sửa / gửi duyệt / lưu trữ bản đồ CỦA CHÍNH MÌNH.
 *
 * Máy trạng thái phía creator:
 *   draft | rejected  --submit-->  pending
 *   draft | rejected | pending | published  --archive-->  archived
 *   archived  --restore-->  draft
 *   save: sửa nội dung khi draft | rejected | pending | published.
 *         Bản đã xuất bản đổi tên hoặc mã map → quay về pending để duyệt lại
 *         (mã map là thứ người chơi nhập vào game, sai là hại người chơi).
 * hidden / removed do kiểm duyệt viên đặt — creator không tự gỡ được.
 */

const schema = z.object({
  action: z.enum(["save", "submit", "archive", "restore"]),
  fields: mapInputSchema.optional(),
  note: z.string().trim().max(300).optional(),
});

const EDITABLE: CraftlandMapStatus[] = ["draft", "rejected", "pending", "published"];
const SUBMITTABLE: CraftlandMapStatus[] = ["draft", "rejected"];
const ARCHIVABLE: CraftlandMapStatus[] = ["draft", "rejected", "pending", "published"];

async function loadOwned(id: string, userId: string): Promise<CraftlandMap | null> {
  const { data } = (await tbl("craftland_maps").select("*").eq("id", id).eq("creator_id", userId).maybeSingle()) as unknown as {
    data: CraftlandMap | null;
  };
  return data;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio", limit: 60 });
  if (denied) return denied;
  const { id } = await params;
  const map = await loadOwned(id, actor.userId);
  // 404 cả khi map tồn tại nhưng của người khác — không lộ việc id có tồn tại.
  if (!map) return fail(404, "Không tìm thấy bản đồ.");
  return NextResponse.json({ map });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio-write", limit: 30 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  const { id } = await params;

  const map = await loadOwned(id, actor.userId);
  if (!map) return fail(404, "Không tìm thấy bản đồ.");

  const creator = await getCreatorByUserId(actor.userId);
  if (!creator || creator.status !== "active") return fail(403, "Hồ sơ creator đang bị khoá.");

  const { action, fields } = body.data;
  const patch: Record<string, unknown> = {};
  let note = body.data.note ? cleanText(body.data.note) : "";

  if (fields) {
    if (!EDITABLE.includes(map.status)) return fail(409, "Bản đồ ở trạng thái này không chỉnh sửa được.");
    Object.assign(patch, {
      title: cleanText(fields.title),
      summary: cleanText(fields.summary),
      description: cleanText(fields.description),
      category_slug: fields.category_slug,
      tags: Array.from(new Set(fields.tags)),
      map_code: fields.map_code,
      platforms: fields.platforms,
      cover_url: fields.cover_url,
      gallery: fields.gallery,
      video_url: fields.video_url,
      how_to_play: cleanText(fields.how_to_play),
    });
    // Creator đổi nền tảng → mất xác nhận nền tảng của kiểm duyệt viên.
    if (JSON.stringify([...fields.platforms].sort()) !== JSON.stringify([...map.platforms].sort())) {
      patch.platforms_verified = false;
    }
    if (map.status === "published" && (patch.title !== map.title || patch.map_code !== map.map_code)) {
      patch.status = "pending";
      patch.submitted_at = new Date().toISOString();
      note ||= "Đổi tên hoặc mã map — chờ duyệt lại";
    }
  }

  if (action === "submit") {
    if (!creator.can_publish) return fail(403, "Tài khoản của bạn đang bị tạm dừng quyền đăng bản đồ.");
    if (!SUBMITTABLE.includes(map.status)) return fail(409, "Chỉ gửi duyệt được bản nháp hoặc bản bị từ chối.");
    const next = { ...map, ...patch } as CraftlandMap;
    const missing: string[] = [];
    if (!next.map_code) missing.push("mã map");
    if (!next.cover_url) missing.push("ảnh cover");
    if ((next.summary ?? "").length < 10) missing.push("mô tả ngắn (≥ 10 ký tự)");
    if (missing.length) return fail(400, `Cần bổ sung trước khi gửi duyệt: ${missing.join(", ")}.`);
    patch.status = "pending";
    patch.submitted_at = new Date().toISOString();
  } else if (action === "archive") {
    if (!ARCHIVABLE.includes(map.status)) return fail(409, "Không lưu trữ được bản đồ ở trạng thái này.");
    patch.status = "archived";
  } else if (action === "restore") {
    if (map.status !== "archived") return fail(409, "Chỉ khôi phục được bản đồ đang lưu trữ.");
    patch.status = "draft";
  } else if (!fields) {
    return fail(400, "Không có gì để lưu.");
  }

  const contentChanged = !!fields;
  if (contentChanged) patch.version = map.version + 1;

  const { data: updated, error } = (await tbl("craftland_maps")
    .update(patch as never)
    .eq("id", id)
    .eq("creator_id", actor.userId)
    .select("*")
    .single()) as unknown as { data: CraftlandMap | null; error: { code?: string; message: string } | null };
  if (error?.code === "23503") return fail(400, "Thể loại không tồn tại.");
  if (error || !updated) return fail(400, "Không lưu được thay đổi.");

  if (contentChanged) {
    await tbl("craftland_map_versions").insert({
      map_id: id,
      version: updated.version,
      snapshot: { ...fields, status: updated.status },
      editor_id: actor.userId,
      note: note || (action === "submit" ? "Cập nhật và gửi duyệt" : "Cập nhật nội dung"),
    } as never);
  }

  if (patch.status && patch.status !== map.status) {
    await logCraftlandAction({
      actor,
      targetType: "map",
      targetId: id,
      action: `creator_${action}`,
      reason: note || null,
      metadata: { from: map.status, to: patch.status },
      summary: `Creator ${creator.username} chuyển bản đồ "${map.title}" ${map.status} → ${String(patch.status)}`,
      request,
      staffAction: false,
    });
  }

  return NextResponse.json({ map: updated });
}
