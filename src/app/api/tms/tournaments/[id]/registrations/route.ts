import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getTmsRegistrations, registerTeam, updateRegistrationStatus } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const regs = await getTmsRegistrations(id).catch(() => []);
  return NextResponse.json(regs);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { team_id } = (await req.json()) as { team_id: string };
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const sb = createServerSupabaseClient();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: teamRow } = await untypedFrom(sb, "tms_teams").select("captain_id").eq("id", team_id).single() as { data: { captain_id: string } | null };
  if (!teamRow || teamRow.captain_id !== auth.userId)
    return NextResponse.json({ error: "Chỉ captain mới được đăng ký." }, { status: 403 });

  try {
    const reg = await registerTeam(tournamentId, team_id);
    return NextResponse.json(reg, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;
  const { reg_id, status, group_label } = (await req.json()) as {
    reg_id: string; status: "approved" | "rejected"; group_label?: string;
  };
  try {
    await updateRegistrationStatus(reg_id, status, group_label);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
