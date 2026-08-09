import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let phone = searchParams.get("phone")?.trim() || "";

  if (!phone) {
    return NextResponse.json(
      { error: "Vui lòng nhập số điện thoại" },
      { status: 400 }
    );
  }

  // Tự động chuẩn hóa số điện thoại: 033... -> 8433...
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "84" + cleaned.slice(1);
  }

  if (!cleaned.startsWith("84")) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận số điện thoại Việt Nam bắt đầu bằng 84 (ví dụ: 84123456789 hoặc 0123456789)" },
      { status: 400 }
    );
  }

  try {
    const targetUrl = `https://phonel00kup01.vercel.app/api/check?phone=${cleaned}&country=VN`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.5",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://phonel00kup01.vercel.app/",
        'sec-ch-ua': '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        'sec-ch-ua-platform': '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Lỗi kết nối tới máy chủ tra cứu (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
    return NextResponse.json(
      { error: `Không thể tra cứu: ${errorMsg}` },
      { status: 500 }
    );
  }
}
