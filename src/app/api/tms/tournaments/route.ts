import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTournaments, createTmsTournament } from "@/lib/tms/data";

export async function GET() {
  const tournaments = await getTmsTournaments(false).catch(() => []);
  return NextResponse.json(tournaments);
}

export async function POST(req: Request) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const tournament = await createTmsTournament(body, auth.userId);
    return NextResponse.json(tournament, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
