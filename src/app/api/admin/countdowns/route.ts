import { NextRequest, NextResponse } from "next/server";
import { updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getCountdowns } from "@/lib/server/countdowns";
import {
  parseCountdowns,
  serializeCountdowns,
  SETTINGS_KEY_COUNTDOWNS,
} from "@/lib/constants/countdowns";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-countdowns", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const items = await getCountdowns();
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-countdowns", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parseCountdowns(JSON.stringify(body.items));

  try {
    await updateSetting(SETTINGS_KEY_COUNTDOWNS, serializeCountdowns(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_COUNTDOWNS,
    summary: `Cập nhật Đếm ngược (${cleaned.length} mốc)`,
  }).catch(() => {});

  return NextResponse.json({ items: cleaned });
}
