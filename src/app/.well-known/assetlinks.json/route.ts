import { NextResponse } from "next/server";

/**
 * Digital Asset Links — cho phép app Android mở thẳng link arexnetwork.site
 * (Android App Links) mà không hỏi chọn trình duyệt.
 *
 * Cần env `ANDROID_APP_SHA256_FINGERPRINTS`: vân tay SHA-256 của chứng chỉ ký
 * app, cách nhau bằng dấu phẩy. Lấy ở Google Play Console → Setup → App
 * signing, hoặc từ keystore:
 *   keytool -list -v -keystore arex-release.jks -alias arex
 * Chưa cấu hình thì route trả 404 (không khai báo còn hơn khai sai).
 */
export const dynamic = "force-dynamic";

const PACKAGE_NAME = process.env.ANDROID_APP_PACKAGE ?? "site.arexnetwork.app";

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return new NextResponse("Not configured", { status: 404 });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
