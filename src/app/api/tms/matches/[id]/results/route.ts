import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsMatchResults, submitTmsResults } from "@/lib/tms/data";
import type { SubmitResultInput } from "@/lib/tms/types";
import { createNotifications } from "@/lib/server/notifications";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-match-results", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await params;
  const results = await getTmsMatchResults(id).catch(() => []);
  return NextResponse.json(results);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-match-results-post", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
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

    // Check tournament achievements for each player
    const db = createAdminSupabaseClient();
    if (db && playerUserIds.length > 0) {
      void (async () => {
        const { checkTournamentAchievements, checkRankAchievements } = await import("@/lib/server/award-achievement");
        await Promise.allSettled(playerUserIds.map(async (userId) => {
          try {
            const { data: career } = await untypedFrom(db, "tms_player_leaderboard")
              .select("total_kills, total_wins, tournaments_played")
              .eq("user_id", userId)
              .maybeSingle() as { data: { total_kills: number; total_wins: number; tournaments_played: number } | null };

            const playerResult = body.players.find((p) => p.user_id === userId);
            const isTop3 = body.placement != null && body.placement <= 3;

            await checkTournamentAchievements(userId, {
              tournamentsPlayed: career?.tournaments_played ?? 1,
              totalWins: career?.total_wins ?? 0,
              totalKills: career?.total_kills ?? 0,
              hasTop3: isTop3,
            });

            // Award points for win / top3
            if (playerResult?.team_id === body.winner_id) {
              await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
                .rpc("increment_user_points", { uid: userId, amount: 20 });
            } else if (isTop3) {
              await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
                .rpc("increment_user_points", { uid: userId, amount: 10 });
            }

            // Re-check rank achievements after points update
            const { data: userRow } = await untypedFrom(db, "users")
              .select("points").eq("id", userId).single() as { data: { points: number } | null };
            if (userRow) await checkRankAchievements(userId, userRow.points);
          } catch { /* non-critical */ }
        }));
      })();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
