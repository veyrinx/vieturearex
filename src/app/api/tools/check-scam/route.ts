import { NextResponse } from "next/server";

export type ScamItem = {
  title: string;
  url: string;
  date: string;
  views: string;
  amount: string;
};

export type CheckScamResponse = {
  query: string;
  warningCount: number;
  headerMessage: string;
  status: "SAFE" | "SCAM_WARNING" | "UNKNOWN";
  items: ScamItem[];
  directUrl: string;
  isCloudflareBlocked?: boolean;
  error?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";

  if (!query) {
    return NextResponse.json(
      { error: "Vui lòng nhập số tài khoản, SĐT, tên hoặc ID cần check" },
      { status: 400 }
    );
  }

  const targetUrl = `https://checkscam.vn/?qh_ss=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        referer: "https://checkscam.vn/",
        "sec-ch-ua": '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    });

    const html = await res.text();

    // Check Cloudflare block
    if (html.includes("Just a moment...") || html.includes("Attention Required! | Cloudflare") || html.includes("cf_chl_opt")) {
      return NextResponse.json<CheckScamResponse>({
        query,
        warningCount: 0,
        headerMessage: `Không thể quét tự động do bảo vệ Cloudflare của Checkscam.vn. Vui lòng bấm bên dưới để mở thẳng trang kết quả checkscam.vn cho "${query}".`,
        status: "UNKNOWN",
        items: [],
        directUrl: targetUrl,
        isCloudflareBlocked: true,
      });
    }

    // Parse Warning Count
    // e.g.: <h2 class="h1">Có 29 cảnh báo liên quan đến:<br> "327289940"</h2>
    let warningCount = 0;
    let headerMessage = "Chưa có báo cáo lừa đảo nào được ghi nhận.";
    const countMatch = html.match(/Có\s+([\d.,]+)\s+cảnh\s+báo/i);
    if (countMatch) {
      warningCount = parseInt(countMatch[1].replace(/\D/g, ""), 10) || 0;
      headerMessage = `Phát hiện ${warningCount} cảnh báo lừa đảo liên quan đến "${query}"!`;
    }

    // Parse list items (div.ct)
    const items: ScamItem[] = [];
    const ctRegex = /<div\s+class=["']ct["']>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;

    while ((match = ctRegex.exec(html)) !== null) {
      const block = match[1];

      // Extract Title & Link: <div class="ct1"><a href="...">TITLE</a></div>
      const linkMatch = block.match(/href=["'](https?:\/\/checkscam\.vn\/[^"']+)["'][^>]*>(.*?)<\/a>/i);
      const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, "").trim() : "";
      const url = linkMatch ? linkMatch[1] : "";

      // Date & Views: <span>21/02/2026</span>... <span>7104 view</span>
      const dateMatch = block.match(/<span>(\d{2}\/\d{2}\/\d{4})<\/span>/i);
      const date = dateMatch ? dateMatch[1] : "";

      const viewsMatch = block.match(/<span>(\d+)\s*view<\/span>/i);
      const views = viewsMatch ? `${viewsMatch[1]} lượt xem` : "";

      // Amount: <span class="qh-sotien">...1,2 triệu</span>
      const amountMatch = block.match(/class=["']qh-sotien["'][^>]*>([\s\S]*?)<\/span>/i);
      let amount = "";
      if (amountMatch) {
        amount = amountMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      if (title && url) {
        items.push({
          title,
          url,
          date,
          views,
          amount,
        });
      }
    }

    const status = warningCount > 0 ? "SCAM_WARNING" : "SAFE";

    return NextResponse.json<CheckScamResponse>({
      query,
      warningCount,
      headerMessage,
      status,
      items,
      directUrl: targetUrl,
      isCloudflareBlocked: false,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
    return NextResponse.json<CheckScamResponse>({
      query,
      warningCount: 0,
      headerMessage: `Không thể truy vấn checkscam.vn: ${errorMsg}`,
      status: "UNKNOWN",
      items: [],
      directUrl: targetUrl,
      error: errorMsg,
    });
  }
}
