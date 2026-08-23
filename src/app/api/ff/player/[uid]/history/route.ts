import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { normalizePlayerUid } from "@/lib/server/ff-api";
import { getPlayerTimeline, describeChange } from "@/lib/server/ff-watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ff/player/[uid]/history
 *
 * Dòng thời gian biến động của một nick — chỉ có dữ liệu với nick đã được ai đó
 * ghim theo dõi (xem /api/user/ff-watch). Nick chưa ai theo dõi trả về rỗng kèm
 * `tracked: false` để UI mời người dùng bấm theo dõi thay vì hiện "không có gì".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const limited = enforceRateLimit(request, { name: "ff-history", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { uid } = await params;
  const ffId = normalizePlayerUid(uid);
  if (!ffId) return NextResponse.json({ error: "Player UID không hợp lệ." }, { status: 400 });

  const timeline = await getPlayerTimeline(ffId);

  return NextResponse.json(
    {
      tracked: timeline.trackedSince !== null,
      trackedSince: timeline.trackedSince,
      latest: timeline.latest,
      nicknameChanges: timeline.nicknameChanges,
      guildChanges: timeline.guildChanges,
      changes: timeline.changes.map((c) => ({ ...c, text: describeChange(c) })),
    },
    { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=600" } },
  );
}
