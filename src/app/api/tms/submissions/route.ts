import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createScoreSubmission, getScoreSubmissions, getUserSubmissions } from "@/lib/tms/data";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournament_id");

  const adminRoles = ["super_admin", "admin", "it", "manager", "support"];
  const isAdmin = adminRoles.includes(auth.role);

  if (isAdmin && tournamentId) {
    const subs = await getScoreSubmissions(tournamentId).catch(() => []);
    return NextResponse.json(subs);
  }

  const subs = await getUserSubmissions(auth.userId).catch(() => []);
  const filtered = tournamentId ? subs.filter((s) => s.tournament_id === tournamentId) : subs;
  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    tournament_id?: string;
    match_id?: string | null;
    team_id?: string | null;
    ff_id?: string;
    kills?: number;
    assists?: number;
    deaths?: number;
    proof_url?: string | null;
    notes?: string | null;
  };

  if (!body.tournament_id || !body.ff_id) {
    return NextResponse.json({ error: "tournament_id and ff_id required" }, { status: 400 });
  }

  try {
    const sub = await createScoreSubmission(
      {
        tournament_id: body.tournament_id,
        match_id: body.match_id ?? null,
        team_id: body.team_id ?? null,
        ff_id: body.ff_id,
        kills: body.kills ?? 0,
        assists: body.assists ?? 0,
        deaths: body.deaths ?? 0,
        proof_url: body.proof_url ?? null,
        notes: body.notes ?? null,
      },
      auth.userId,
    );
    return NextResponse.json(sub, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
