import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getTmsPlayerCareer, getMyTmsTeam } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: user } = await untypedFrom(sb, "users")
    .select("id, display_name, avatar_url, ff_id, created_at")
    .eq("id", userId)
    .single() as {
      data: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        ff_id: string | null;
        created_at: string;
      } | null;
    };

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [career, team] = await Promise.all([
    getTmsPlayerCareer(userId).catch(() => []),
    getMyTmsTeam(userId).catch(() => null),
  ]);

  const totalMatches = career.reduce((s, r) => s + r.matches_played, 0);
  const totalKills   = career.reduce((s, r) => s + r.total_kills, 0);
  const totalAssists = career.reduce((s, r) => s + r.total_assists, 0);
  const totalDeaths  = career.reduce((s, r) => s + r.total_deaths, 0);
  const totalPoints  = career.reduce((s, r) => s + r.total_points, 0);
  const totalWins    = career.reduce((s, r) => s + r.wins, 0);
  const kdRatio      = totalDeaths > 0 ? +(totalKills / totalDeaths).toFixed(2) : totalKills;

  return NextResponse.json({
    user,
    team,
    career,
    stats: { totalMatches, totalKills, totalAssists, totalDeaths, totalPoints, totalWins, kdRatio },
  });
}
