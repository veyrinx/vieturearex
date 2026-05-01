import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createTmsMatch, getTmsMatches } from "@/lib/tms/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournament_id");
  if (!tournamentId) return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  const matches = await getTmsMatches(tournamentId).catch(() => []);
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as Parameters<typeof createTmsMatch>[0];
  try {
    const match = await createTmsMatch(body, auth.userId);
    return NextResponse.json(match, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
