import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  getTmsRegistrations, registerTeam, updateRegistrationStatus,
  getTmsTournamentById, getTmsTeam,
} from "@/lib/tms/data";
import { createNotification } from "@/lib/server/notifications";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const regs = await getTmsRegistrations(id).catch(() => []);
  return NextResponse.json(regs);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { team_id } = (await req.json().catch(() => ({}))) as { team_id?: string };
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: teamRow } = await untypedFrom(db, "tms_teams")
    .select("captain_id, name, tag")
    .eq("id", team_id)
    .single() as { data: { captain_id: string; name: string; tag: string } | null };
  if (!teamRow || teamRow.captain_id !== auth.userId)
    return NextResponse.json({ error: "Chỉ captain mới được đăng ký." }, { status: 403 });

  const { data: tournamentRow } = await untypedFrom(db, "tms_tournaments")
    .select("id, name, slug, status, max_teams, auto_approve_registrations")
    .eq("id", tournamentId)
    .single() as { data: { id: string; name: string; slug: string; status: string; max_teams: number; auto_approve_registrations: boolean } | null };

  if (!tournamentRow) return NextResponse.json({ error: "Không tìm thấy giải đấu." }, { status: 404 });
  if (tournamentRow.status !== "registering" && tournamentRow.status !== "ongoing") {
    return NextResponse.json({ error: "Giải đấu không trong giai đoạn đăng ký." }, { status: 400 });
  }

  try {
    const reg = await registerTeam(tournamentId, team_id);

    // Auto-approve if tournament has setting enabled
    if (tournamentRow.auto_approve_registrations) {
      await updateRegistrationStatus(reg.id, "approved");
      await createNotification({
        user_id: auth.userId,
        type: "registration_approved",
        title: "Đăng ký được duyệt tự động!",
        body: `[${teamRow.tag}] ${teamRow.name} đã được chấp nhận vào ${tournamentRow.name}`,
        entity_type: "tournament",
        entity_id: tournamentId,
        entity_url: `/tournaments/${tournamentRow.slug}`,
      });
      return NextResponse.json({ ...reg, status: "approved" }, { status: 201 });
    }

    return NextResponse.json(reg, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const { reg_id, status, group_label } = (await req.json().catch(() => ({}))) as {
    reg_id: string; status: "approved" | "rejected"; group_label?: string;
  };

  try {
    await updateRegistrationStatus(reg_id, status, group_label);

    // Fetch reg details to notify team captain
    const db = createAdminSupabaseClient();
    if (db) {
      const { data: reg } = await untypedFrom(db, "tms_registrations")
        .select("team_id, tournament_id")
        .eq("id", reg_id)
        .single() as { data: { team_id: string; tournament_id: string } | null };

      if (reg) {
        const [team, tournament] = await Promise.all([
          getTmsTeam(reg.team_id).catch(() => null),
          getTmsTournamentById(reg.tournament_id).catch(() => null),
        ]);
        if (team && tournament) {
          await createNotification({
            user_id: team.captain_id,
            type: status === "approved" ? "registration_approved" : "registration_rejected",
            title: status === "approved" ? "Đăng ký được duyệt! 🎉" : "Đăng ký bị từ chối",
            body: `[${team.tag}] ${team.name} trong giải ${tournament.name}`,
            entity_type: "tournament",
            entity_id: tournament.id,
            entity_url: `/tournaments/${tournament.slug}`,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
