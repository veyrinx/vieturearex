import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getTmsTournamentById, updateTmsTournament } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTmsTournamentById(id).catch(() => null);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const t = await updateTmsTournament(id, body);
    return NextResponse.json(t);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
