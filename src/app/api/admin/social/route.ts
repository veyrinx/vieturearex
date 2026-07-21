import { NextRequest, NextResponse } from "next/server";
import { updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getSocialVideos } from "@/lib/server/social";
import { parseSocialVideos, serializeSocialVideos, SETTINGS_KEY_SOCIAL } from "@/lib/constants/social";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-social", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const items = await getSocialVideos();
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-social", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parseSocialVideos(JSON.stringify(body.items));

  try {
    await updateSetting(SETTINGS_KEY_SOCIAL, serializeSocialVideos(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_SOCIAL,
    summary: `Cập nhật video MXH (${cleaned.length} mục)`,
  }).catch(() => {});

  return NextResponse.json({ items: cleaned });
}
