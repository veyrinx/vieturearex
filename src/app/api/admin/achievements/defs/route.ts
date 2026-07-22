import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { updateSetting } from "@/lib/data/content-service";
import { getCustomAchievements } from "@/lib/server/achievements";
import {
  SETTINGS_KEY_CUSTOM_ACHIEVEMENTS,
  parseCustomAchievements,
  serializeCustomAchievements,
} from "@/lib/constants/achievements";

// GET — danh sách loại huy hiệu tuỳ chỉnh (admin tạo).
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-ach-defs-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const items = await getCustomAchievements();
  return NextResponse.json({ items });
}

// PUT — thay toàn bộ danh sách loại huy hiệu tuỳ chỉnh.
export async function PUT(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-ach-defs-put", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  // parse lại từ JSON để tự validate + khử id trùng/không hợp lệ.
  const cleaned = parseCustomAchievements(JSON.stringify(body.items));

  try {
    await updateSetting(SETTINGS_KEY_CUSTOM_ACHIEVEMENTS, serializeCustomAchievements(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_CUSTOM_ACHIEVEMENTS,
    summary: `Cập nhật loại huy hiệu tuỳ chỉnh (${cleaned.length} loại)`,
  }).catch(() => {});

  return NextResponse.json({ items: cleaned });
}
