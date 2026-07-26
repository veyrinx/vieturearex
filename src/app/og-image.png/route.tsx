import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getSiteConfigByHostname } from "@/lib/constants/site";

// Ảnh OG mặc định của site. Đặt ở path `/og-image.png` vì siteConfig.ogImage và
// nhiều trang đã trỏ sẵn tới URL này — trước đây là file tĩnh không tồn tại nên
// mọi link share đều 404 ảnh. Sinh động theo hostname để Arex/ISC ra đúng brand.
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

export async function GET() {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  const site = getSiteConfigByHostname(hostname);
  const domain = site.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "linear-gradient(135deg, #0b1220 0%, #1a1305 100%)",
          color: "white",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 82% 28%, rgba(249,115,22,0.24) 0%, transparent 55%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#f59e0b",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#f59e0b",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              color: "#0b1220",
              fontWeight: 900,
            }}
          >
            {site.shortName.charAt(0)}
          </div>
          Cộng đồng Free Fire
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, marginTop: 24, lineHeight: 1.05 }}>
          {site.shortName}
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 20, color: "#cbd5e1", maxWidth: 940, lineHeight: 1.35 }}>
          Tin tức, sự kiện in-game, Esports và công cụ tra cứu Free Fire — cập nhật nhanh nhất.
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: "#94a3b8" }}>{domain}</div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Content-Type": "image/png",
        // Crawler (Facebook/Zalo/Telegram/Discord) cache ảnh khá lâu — cho CDN giữ 1 ngày.
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
