import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createTmsMatch, getTmsMatches } from "@/lib/tms/data";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { formatVietnamDateTime } from "@/lib/utils/vietnam-time";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tms-matches", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournament_id");
  if (!tournamentId) return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  const matches = await getTmsMatches(tournamentId).catch(() => []);
  return NextResponse.json(matches);
}

export async function POST(req: NextRequest) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as Parameters<typeof createTmsMatch>[0];
  try {
    const match = await createTmsMatch(body, auth.userId);

    void sendTelegramNotification({
      title: "⚔️ TRẬN ĐẤU MỚI",
      subtitle: vnNow(),
      sections: [{
        rows: [
          { label: "Vòng", value: `${match.round} #${match.round_num}`, bold: true },
          ...(match.scheduled_at ? [{ label: "🗓 Thời gian", value: formatVietnamDateTime(match.scheduled_at) }] : []),
        ],
      }],
      footer: "🏆 Arex TMS",
    }).catch(() => null);

    return NextResponse.json(match, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    void sendTelegramNotification({
      title: "❌ LỖI TẠO TRẬN ĐẤU",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Chi tiết", value: msg.slice(0, 300), status: "err" }] }],
      footer: "⚠️ Arex TMS",
    }).catch(() => null);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
