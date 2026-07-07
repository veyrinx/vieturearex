import { NextResponse } from "next/server";
import { getGlobalPlayerLeaderboard, getGlobalTeamLeaderboard } from "@/lib/tms/data";

// Public leaderboard feed (top players + teams). CORS for all /api/* is set
// centrally in next.config.mjs headers().
export const dynamic = "force-dynamic";

export async function GET() {
  const [players, teams] = await Promise.all([
    getGlobalPlayerLeaderboard(20).catch(() => []),
    getGlobalTeamLeaderboard(20).catch(() => []),
  ]);
  return NextResponse.json({ players, teams });
}
