import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { signAppRelease } from "@/lib/server/app-releases";

/**
 * Link tải bản cài đặt Arex Hub cho nhân viên (Support trở lên).
 *
 * Khác /api/admin/app-releases/download — endpoint đó đòi vai trò admin và mở
 * cho mọi file trong kho. Ở đây chỉ cho tải đúng file của Arex Hub (tên do CI
 * đặt là `arex-hub-…`), để cả team tự tải app quản trị mà không đụng tới bản
 * build của app người dùng.
 */
export const dynamic = "force-dynamic";

/** <platform>/<version>/arex-hub-<...>.<apk|aab|ipa> — chặn cả path traversal. */
const PATH_PATTERN = /^(android|ios)\/[\w.-]+\/arex[-_]hub[\w.-]*\.(apk|aab|ipa)$/i;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "hub-app-download",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
  }

  const signedUrl = await signAppRelease(path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Không tạo được link tải" }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
