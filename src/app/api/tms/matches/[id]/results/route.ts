import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsMatchResults, submitTmsResults } from "@/lib/tms/data";
import type { SubmitResultInput } from "@/lib/tms/types";
import { createNotifications } from "@/lib/server/notifications";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await getTmsMatchResults(id).catch(() => []);
  return NextResponse.json(results);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as Omit<SubmitResultInput, "match_id">;
  try {
    await submitTmsResults({ ...body, match_id: id }, auth.userId);

    // In-app notifications for all players in this match
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    const playerUserIds = (body.players ?? []).map((p) => p.user_id).filter(Boolean);
    if (playerUserIds.length > 0) {
      void createNotifications(
        playerUserIds.map((userId) => {
          const isWinner = body.players.find((p) => p.user_id === userId)?.team_id === body.winner_id;
          return {
            user_id: userId,
            type: "match_result",
            title: isWinner ? "Chúc mừng! Team bạn đã thắng trận 🏆" : "Kết quả trận đấu đã được cập nhật",
            body: `Xem chi tiết thống kê tại trang giải đấu`,
            entity_type: "tournament",
            entity_id: body.tournament_id,
            entity_url: `${siteUrl}/tournaments`,
          };
        })
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
