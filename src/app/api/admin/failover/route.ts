import { NextRequest, NextResponse } from "next/server";
import { getSettingsByKeys, updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity, resolveCurrentAdminEmail } from "@/lib/server/admin-activity";
import {
  SETTINGS_KEY_FAILOVER,
  normalizeOrigin,
  parseFailover,
  serializeFailover,
} from "@/lib/constants/failover";

async function readConfig() {
  const rows = await getSettingsByKeys([SETTINGS_KEY_FAILOVER]);
  return parseFailover(rows.find((r) => r.key === SETTINGS_KEY_FAILOVER)?.value ?? null);
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-failover", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  return NextResponse.json({
    config: await readConfig(),
    // Máy đang trả lời chính là máy sẽ đẩy khách đi — hiện lên để khỏi bật nhầm
    // công tắc ngay trên máy đích.
    currentHost: request.headers.get("host") ?? "",
  });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-failover", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "settings.edit" });
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { enabled?: unknown; target?: unknown; note?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const enabled = body.enabled === true;
  const rawTarget = typeof body.target === "string" ? body.target : "";
  const target = rawTarget ? normalizeOrigin(rawTarget) : "";
  if (rawTarget && !target) {
    return NextResponse.json(
      { error: "Địa chỉ máy chủ không hợp lệ. Ví dụ đúng: https://vieturearex.vercel.app" },
      { status: 400 },
    );
  }
  if (enabled && !target) {
    return NextResponse.json({ error: "Bật chuyển hướng thì phải có địa chỉ đích." }, { status: 400 });
  }

  // Chặn ngay từ đây việc trỏ về chính máy đang cấu hình: middleware có chốt
  // chống lặp, nhưng để người dùng lưu được một giá trị vô nghĩa thì lúc sự cố
  // sẽ tưởng đã bật xong mà thật ra không ai đi đâu cả.
  const currentHost = (request.headers.get("host") ?? "").toLowerCase();
  if (enabled && target) {
    const strip = (h: string) => h.replace(/^www\./, "");
    if (strip(new URL(target).host.toLowerCase()) === strip(currentHost)) {
      return NextResponse.json(
        { error: "Đích trùng chính máy này. Mở trang admin trên máy còn lại rồi bật, hoặc điền địa chỉ máy kia." },
        { status: 400 },
      );
    }
  }

  const actor = await resolveCurrentAdminEmail().catch(() => undefined);
  const value = serializeFailover({
    enabled,
    target: target ?? "",
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
    note: typeof body.note === "string" ? body.note : undefined,
  });

  try {
    await updateSetting(SETTINGS_KEY_FAILOVER, value);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: enabled ? "FAILOVER_ENABLED" : "FAILOVER_DISABLED",
    targetType: "SYSTEM",
    targetId: SETTINGS_KEY_FAILOVER,
    summary: enabled ? `Bật chuyển hướng sang ${target}` : "Tắt chuyển hướng, khách ở lại máy này",
  }).catch(() => {});

  return NextResponse.json({ config: parseFailover(value), currentHost });
}
