import { NextResponse } from "next/server";
import { getGlobalPlayerLeaderboard, getGlobalTeamLeaderboard } from "@/lib/tms/data";

// Public leaderboard feed (top players + teams) for external clients such as the
// Zalo Mini App. CORS-enabled like /api/news, /api/events, /api/tms/tournaments.
export const dynamic = "force-dynamic";

// CORS: middleware handles preflight, but we also set the header on the GET
// response directly so cross-origin fetches (Zalo Mini App) work even if the
// middleware isn't applying it at the edge.
export async function GET() {
  const [players, teams] = await Promise.all([
    getGlobalPlayerLeaderboard(20).catch(() => []),
    getGlobalTeamLeaderboard(20).catch(() => []),
  ]);
  return NextResponse.json({ players, teams }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

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
