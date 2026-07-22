import { NextRequest, NextResponse } from "next/server";
import { updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getPageContents } from "@/lib/server/page-content";
import {
  parsePageContents,
  serializePageContents,
  SETTINGS_KEY_PAGES,
} from "@/lib/constants/page-content";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-page-content", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const items = await getPageContents();
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-page-content", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parsePageContents(JSON.stringify(body.items));

  try {
    await updateSetting(SETTINGS_KEY_PAGES, serializePageContents(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_PAGES,
    summary: `Cập nhật Nội dung trang (${cleaned.filter((c) => c.body.trim()).length} trang)`,
  }).catch(() => {});

  return NextResponse.json({ items: cleaned });
}
