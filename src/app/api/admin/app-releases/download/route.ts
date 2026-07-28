import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { signAppRelease } from "@/lib/server/app-releases";

/** Chỉ nhận đúng dạng <platform>/<version>/<file>.<apk|aab|ipa> — chặn path traversal. */
const PATH_PATTERN = /^(android|ios)\/[\w.-]+\/[\w.-]+\.(apk|aab|ipa)$/;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-app-release-download", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
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
