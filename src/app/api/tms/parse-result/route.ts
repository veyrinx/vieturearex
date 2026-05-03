import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { ocrFromUrl, ocrFromBase64, ocrFromFetch } from "@/lib/server/ff-ocr";

const BOT_SECRET = process.env.BOT_API_SECRET;

function isBotRequest(req: NextRequest) {
  return BOT_SECRET && req.headers.get("x-bot-secret") === BOT_SECRET;
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-ocr", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const isBot = isBotRequest(req);
  if (!isBot) {
    const auth = await getAuthContext();
    if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    base64?: string;
    media_type?: string;
    fetch_url?: string;
  };

  try {
    if (body.url) {
      const result = await ocrFromUrl(body.url);
      return NextResponse.json(result);
    }
    if (body.base64 && body.media_type) {
      const mt = body.media_type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      const result = await ocrFromBase64(body.base64, mt);
      return NextResponse.json(result);
    }
    if (body.fetch_url) {
      const result = await ocrFromFetch(body.fetch_url);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Cần url, base64, hoặc fetch_url" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OCR failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
