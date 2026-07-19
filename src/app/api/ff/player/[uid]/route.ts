import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import {
  isFfApiConfigured,
  normalizePlayerUid,
  getPlayerAllData,
} from "@/lib/server/ff-api";

// axios (trong client HL) cần Node runtime, không chạy được ở Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ff/player/[uid]
 * Trả dữ liệu người chơi Free Fire qua HL Gaming Official API.
 * Proxy server-side để KHÔNG lộ API key ra trình duyệt.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const limited = enforceRateLimit(request, { name: "ff-player", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  if (!isFfApiConfigured()) {
    return NextResponse.json({ error: "Free Fire API chưa được cấu hình." }, { status: 503 });
  }

  const { uid } = await params;
  const playerUid = normalizePlayerUid(uid);
  if (!playerUid) {
    return NextResponse.json({ error: "Player UID không hợp lệ." }, { status: 400 });
  }

  try {
    const data = await getPlayerAllData(playerUid);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: `Không lấy được dữ liệu: ${message}` }, { status: 502 });
  }
}
