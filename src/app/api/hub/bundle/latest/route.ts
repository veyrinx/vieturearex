import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { compareVersions, latestHubBundle, signHubBundle } from "@/lib/server/hub-bundles";

export const dynamic = "force-dynamic";

/**
 * App Arex Hub hỏi "có bundle mới không?".
 *
 *   GET /api/hub/bundle/latest?current=1.0.0
 *     → { update: { version, url, notes, sizeBytes, updatedAt } }   khi có bản mới
 *     → { update: null, latest: "1.0.0" }                            khi đã mới nhất
 *
 * Trả về signed URL vì plugin cập nhật tải file bằng HTTP thuần, không gắn được
 * `Authorization`. Link hết hạn sau 30 phút nên không dùng lại được về sau.
 *
 * Quyền: Support trở lên — trùng với mức tối thiểu để vào Hub, vì mọi tài khoản
 * dùng app đều phải cập nhật được.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "hub-bundle-latest", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const current = request.nextUrl.searchParams.get("current") ?? "0.0.0";

  try {
    const bundle = await latestHubBundle();
    if (!bundle) return NextResponse.json({ update: null, latest: null });

    // Chỉ báo khi thực sự mới hơn — tránh app tải lại chính bản đang chạy.
    if (compareVersions(bundle.version, current) <= 0) {
      return NextResponse.json({ update: null, latest: bundle.version });
    }

    const url = await signHubBundle(bundle.path);
    if (!url) {
      return NextResponse.json({ error: "Không tạo được link tải bundle." }, { status: 500 });
    }

    return NextResponse.json({
      update: {
        version: bundle.version,
        url,
        notes: bundle.notes,
        sizeBytes: bundle.sizeBytes,
        updatedAt: bundle.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không kiểm tra được bản cập nhật.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
