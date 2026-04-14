import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = [
  "dl.dir.freefiremobile.com",
  "images.unsplash.com",
  "cdn.discordapp.com",
  "i.ytimg.com",
  "upload.wikimedia.org",
];

const CACHE_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return new NextResponse("Only HTTPS allowed", { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.includes(parsed.hostname)) {
    return new NextResponse("Hostname not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://ff.garena.vn/",
        Origin: "https://ff.garena.vn",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
      // Không dùng next.revalidate ở đây vì route là force-dynamic
      // Cache được handle bởi Cache-Control response header
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    // Chỉ cho phép content-type là image
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, immutable`,
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
