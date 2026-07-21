import { NextRequest, NextResponse } from "next/server";
import { updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getResolvedProjects } from "@/lib/server/projects";
import { parseProjects, serializeProjects, SETTINGS_KEY_PROJECTS } from "@/lib/constants/projects";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-projects", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  // Admin trở lên đều XEM được (chỉ xem).
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const projects = await getResolvedProjects();
  return NextResponse.json({ projects });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-projects", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  // Chỉ super_admin được sửa danh sách dự án.
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.projects)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parseProjects(JSON.stringify(body.projects));

  try {
    await updateSetting(SETTINGS_KEY_PROJECTS, serializeProjects(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_PROJECTS,
    summary: `Cập nhật quản lý dự án (${cleaned.length} mục)`,
  }).catch(() => {});

  // Trả lại danh sách đã resolve để UI hiển thị tiến độ mới ngay.
  const projects = await getResolvedProjects();
  return NextResponse.json({ projects });
}
