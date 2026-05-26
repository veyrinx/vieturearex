import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getTmsTournamentById, updateTmsTournament } from "@/lib/tms/data";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { notifyUserTournamentStart } from "@/lib/server/user-notify";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-tournament-detail", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const t = await getTmsTournamentById(id).catch(() => null);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const t = await updateTmsTournament(id, body);

    if (body.status === "ongoing") {
      void notifyUserTournamentStart(t, process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site");
    }

    return NextResponse.json(t);
  } catch (e) {
    const msg = (e as Error).message;
    void sendTelegramNotification({
      title: "❌ LỖI CẬP NHẬT GIẢI ĐẤU",
      subtitle: vnNow(),
      sections: [{ rows: [
        { label: "ID giải", value: id, mono: true },
        { label: "Chi tiết", value: msg.slice(0, 300), status: "err" },
      ]}],
      footer: "⚠️ Arex TMS",
    }).catch(() => null);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
