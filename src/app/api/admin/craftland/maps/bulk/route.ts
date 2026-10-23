import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireMfaIfEnrolled, requireStaff } from "@/lib/server/craftland-api";
import { MAP_ACTIONS, moderateMap } from "@/lib/server/craftland-moderation";

export const dynamic = "force-dynamic";

// Thao tác hàng loạt chỉ cho những việc thường ngày; gỡ bản đồ phải làm từng cái.
const BULK_ACTIONS = ["approve", "reject", "hide", "restore", "verify_platforms", "unpick", "unfeature"] as const;

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(BULK_ACTIONS),
  reason: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const { actor, denied } = await requireStaff(request, "craftland.moderate", 20);
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;
  if (MAP_ACTIONS[body.data.action].sensitive) {
    const mfa = await requireMfaIfEnrolled();
    if (mfa) return mfa;
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  // Tuần tự: mỗi bản đồ một dòng nhật ký riêng, không dồn tải lên DB.
  for (const id of Array.from(new Set(body.data.ids))) {
    const r = await moderateMap({ actor, mapId: id, action: body.data.action, reason: body.data.reason, request });
    results.push(r.ok ? { id, ok: true } : { id, ok: false, error: r.error });
  }
  return NextResponse.json({
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
  });
}
