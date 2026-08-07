import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { latestAppRelease, signAppRelease } from "@/lib/server/app-releases";

export const dynamic = "force-dynamic";

/**
 * Bản cài đặt Arex Hub mới nhất.
 *
 *   GET /api/hub/app/latest?current=1.0.0-41&platform=android
 *     → { release: { version, url, … }, outdated: true }
 *
 * Khác /api/hub/bundle/latest (cập nhật nóng, chỉ thay JS/CSS): endpoint này là
 * file APK/IPA thật, dùng khi phần native đổi (thêm plugin, đổi scheme…) — lúc
 * đó bắt buộc phải cài đè chứ OTA không cứu được.
 *
 * Quyền: Support trở lên, trùng mức tối thiểu để vào Hub.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "hub-app-latest", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const platform = request.nextUrl.searchParams.get("platform") === "ios" ? "ios" : "android";
  const current = request.nextUrl.searchParams.get("current") ?? "";

  try {
    const release = await latestAppRelease("hub", platform);
    if (!release) return NextResponse.json({ release: null, outdated: false });

    // So chuỗi là đủ: phiên bản do CI sinh ra luôn duy nhất theo số run, nên
    // "khác bản đang chạy" đồng nghĩa với "có bản khác để cài".
    const outdated = current.trim() !== release.version;
    const url = await signAppRelease(release.path);

    return NextResponse.json(
      {
        release: {
          version: release.version,
          fileName: release.fileName,
          sizeBytes: release.sizeBytes,
          updatedAt: release.updatedAt,
          platform: release.platform,
          url,
        },
        outdated,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không kiểm tra được bản cài đặt mới.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
