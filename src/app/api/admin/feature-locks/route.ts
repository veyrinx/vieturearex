import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getFeatureLocks } from "@/lib/server/feature-locks";
import {
  parseFeatureLocks,
  serializeFeatureLocks,
  SETTINGS_KEY_FEATURE_LOCKS,
} from "@/lib/constants/feature-locks";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-feature-locks", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const locks = await getFeatureLocks();
  return NextResponse.json({ locks });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-feature-locks", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "settings.edit" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.locks)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  // Làm sạch qua parse (loại path sai, cắt độ dài, chuẩn status)
  const cleaned = parseFeatureLocks(JSON.stringify(body.locks));
  const value = serializeFeatureLocks(cleaned);

  try {
    await updateSetting(SETTINGS_KEY_FEATURE_LOCKS, value);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_FEATURE_LOCKS,
    summary: `Cập nhật khóa chức năng (${cleaned.length} mục)`,
  }).catch(() => {});

  // Xóa cache các trang liên quan
  revalidatePath("/cong-cu");
  revalidatePath("/dang-cap-nhat");

  return NextResponse.json({ locks: cleaned });
}
