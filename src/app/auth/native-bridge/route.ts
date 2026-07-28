import { NextRequest, NextResponse } from "next/server";

/**
 * Cầu nối OAuth cho app native (iOS/Android).
 *
 * Google chặn đăng nhập trong WebView, nên app mở trang OAuth bằng TRÌNH DUYỆT
 * HỆ THỐNG. Provider trả `?code=…` về đây — nhưng code_verifier (PKCE) lại nằm
 * trong cookie của WebView, không phải của trình duyệt hệ thống. Vì vậy trang
 * này không đổi code, chỉ đá ngược về app qua scheme `arex://`, để chính
 * WebView gọi /auth/oauth-callback và đổi code bằng cookie của nó.
 *
 * Luồng: WebView → trình duyệt hệ thống (Google) → /auth/native-bridge
 *        → arex://auth/callback?code=… → WebView → /auth/oauth-callback
 */
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const deepLink = new URL("arex://auth/callback");
  if (code) deepLink.searchParams.set("code", code);
  if (error) deepLink.searchParams.set("error", error);
  deepLink.searchParams.set("next", next);
  const target = deepLink.toString();

  // Không có code lẫn error → truy cập trực tiếp bằng trình duyệt thường.
  if (!code && !error) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Đang quay lại app Arex…</title>
<style>
  :root { color-scheme: light dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
         font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         background:#0a0a0a; color:#fafafa; text-align:center }
  .box { max-width:340px }
  h1 { font-size:18px; font-weight:800; margin:0 0 8px }
  p { font-size:14px; line-height:1.6; color:#a1a1aa; margin:0 0 20px }
  a { display:inline-block; padding:13px 22px; border-radius:12px; background:#f43f5e;
      color:#fff; font-weight:700; font-size:15px; text-decoration:none }
</style>
</head>
<body>
  <div class="box">
    <h1>Đang quay lại ứng dụng Arex…</h1>
    <p>Nếu màn hình không tự chuyển, hãy bấm nút bên dưới.</p>
    <a id="open" href="${target.replace(/"/g, "&quot;")}">Mở app Arex</a>
  </div>
  <script>
    // Chuyển ngay; giữ nút dự phòng cho trình duyệt chặn redirect tự động.
    setTimeout(function () { window.location.replace(document.getElementById("open").href); }, 60);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
