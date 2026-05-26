import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createTmsTeam, getTmsTeams, getMyTmsTeam } from "@/lib/tms/data";
import type { CreateTeamInput } from "@/lib/tms/types";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tms-teams", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  if (searchParams.get("mine") === "true") {
    const auth = await getAuthContext();
    if (!auth.userId) return NextResponse.json(null);
    const team = await getMyTmsTeam(auth.userId).catch(() => null);
    return NextResponse.json(team);
  }
  const teams = await getTmsTeams().catch(() => []);
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as CreateTeamInput;
  if (!body.name?.trim() || !body.tag?.trim())
    return NextResponse.json({ error: "name và tag bắt buộc." }, { status: 400 });
  try {
    const team = await createTmsTeam(body, auth.userId);

    void sendTelegramNotification({
      title: "🏅 TEAM MỚI ĐĂNG KÝ",
      subtitle: vnNow(),
      sections: [{
        rows: [
          { label: "Team", value: `[${team.tag}] ${team.name}`, bold: true },
          { label: "Server", value: team.server.toUpperCase() },
        ],
      }],
      footer: "🏆 Arex TMS",
    }).catch(() => null);

    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    void sendTelegramNotification({
      title: "❌ LỖI TẠO TEAM",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Chi tiết", value: msg.slice(0, 300), status: "err" }] }],
      footer: "⚠️ Arex TMS",
    }).catch(() => null);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
