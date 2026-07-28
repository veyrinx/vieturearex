import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { listAppReleases } from "@/lib/server/app-releases";

export const dynamic = "force-dynamic";

/**
 * Danh sách file cài đặt app (APK/AAB/IPA) trong bucket `app-releases`.
 *
 * Trang /admin/app đọc thẳng `listAppReleases()` phía server, nhưng app native
 * Arex Hub gọi qua REST nên cần endpoint riêng. Link tải vẫn phải xin qua
 * /api/admin/app-releases/download (signed URL, hết hạn sau 30 phút).
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-app-releases", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  try {
    const releases = await listAppReleases();
    return NextResponse.json({ releases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đọc được danh sách bản phát hành.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
