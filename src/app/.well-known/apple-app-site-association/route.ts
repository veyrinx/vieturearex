import { NextResponse } from "next/server";

/**
 * Apple App Site Association — bật Universal Links cho app iOS: link
 * arexnetwork.site bấm ở Safari/Messages sẽ mở thẳng trong app Arex.
 *
 * Cần env `IOS_APP_TEAM_ID` (Apple Developer → Membership → Team ID).
 * Apple yêu cầu trả về content-type application/json và KHÔNG được redirect.
 */
export const dynamic = "force-dynamic";

const BUNDLE_ID = process.env.IOS_APP_BUNDLE_ID ?? "site.arexnetwork.app";

export function GET() {
  const teamId = process.env.IOS_APP_TEAM_ID?.trim();
  if (!teamId) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const appId = `${teamId}.${BUNDLE_ID}`;

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [appId],
            components: [
              // /auth/* để nguyên cho trình duyệt: luồng OAuth phải chạy ngoài app.
              { "/": "/auth/*", exclude: true, comment: "Luồng đăng nhập OAuth" },
              { "/": "/api/*", exclude: true, comment: "API" },
              { "/": "/*", comment: "Mọi trang còn lại mở trong app" },
            ],
          },
        ],
      },
      webcredentials: { apps: [appId] },
    },
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
