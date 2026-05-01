import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsMatchResults, submitTmsResults } from "@/lib/tms/data";
import type { SubmitResultInput } from "@/lib/tms/types";

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
