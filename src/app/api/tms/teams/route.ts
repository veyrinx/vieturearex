import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { createTmsTeam, getTmsTeams } from "@/lib/tms/data";
import type { CreateTeamInput } from "@/lib/tms/types";

export async function GET() {
  const teams = await getTmsTeams().catch(() => []);
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = (await req.json()) as CreateTeamInput;
  if (!body.name?.trim() || !body.tag?.trim())
    return NextResponse.json({ error: "name và tag bắt buộc." }, { status: 400 });
  try {
    const team = await createTmsTeam(body, auth.userId);
    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
