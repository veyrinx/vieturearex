import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTournaments, createTmsTournament } from "@/lib/tms/data";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import type { TmsTournament } from "@/lib/tms/types";

const SITEURL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";

const MODE_LABEL: Record<string, string> = {
  "1v1": "1v1", "2v2": "2v2", "4v4": "4v4", "squad": "Squad",
};

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "tms-tournaments", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const tournaments = await getTmsTournaments(false).catch(() => []);
  // ACAO on the GET response so cross-origin clients (Zalo Mini App) work even
  // if the middleware isn't applying CORS at the edge.
  return NextResponse.json(tournaments, { headers: { "Access-Control-Allow-Origin": "*" } });
}

// Cho phép Zalo Mini App (origin khác) fetch danh sách giải đấu.
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

export async function POST(req: Request) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const tournament = await createTmsTournament(body, auth.userId) as TmsTournament;

    const payload = {
      title: "🏆 GIẢI ĐẤU MỚI!",
      subtitle: `Đăng lúc ${vnNow()} (ICT)`,
      sections: [{
        rows: [
          { label: "🏆 Tên", value: tournament.name, bold: true },
          { label: "🎮 Thể thức", value: MODE_LABEL[tournament.mode] ?? tournament.mode },
          { label: "👥 Số team", value: String(tournament.max_teams) },
          ...(tournament.prize_pool ? [{ label: "💰 Giải thưởng", value: tournament.prize_pool }] : []),
          { label: "📋 Trạng thái", value: tournament.status },
        ],
      }],
      actions: [{ label: "👉 Xem giải đấu", url: `${SITEURL}/tournaments/${tournament.slug}` }],
      footer: "🏆 Arex TMS",
    };

    void Promise.allSettled([
      sendTelegramNotification(payload),
      sendUserTelegramNotification(payload),
    ]);

    return NextResponse.json(tournament, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    void sendTelegramNotification({
      title: "❌ LỖI TẠO GIẢI ĐẤU",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Chi tiết", value: msg.slice(0, 300), status: "err" }] }],
      footer: "⚠️ Arex TMS",
    }).catch(() => null);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
