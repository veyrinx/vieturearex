import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { createNotifications } from "@/lib/server/notifications";
import type { TmsMatch } from "@/lib/tms/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    scheduled_at?: string | null;
    status?: string;
  };

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: match, error } = await untypedFrom(db, "tms_matches")
    .update(body)
    .eq("id", id)
    .select("*, team_a:tms_teams!tms_matches_team_a_id_fkey(id,name,tag,captain_id), team_b:tms_teams!tms_matches_team_b_id_fkey(id,name,tag,captain_id), tournament:tms_tournaments(id,name,slug)")
    .single() as { data: TmsMatch & { team_a: { captain_id: string } | null; team_b: { captain_id: string } | null; tournament?: { name: string; slug: string } } | null; error: unknown };

  if (error || !match) return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 400 });

  // Send notifications to both team captains when scheduled
  if (body.scheduled_at && match.team_a?.captain_id && match.team_b?.captain_id) {
    const scheduledDate = new Date(body.scheduled_at).toLocaleString("vi-VN");
    const tournamentName = (match as { tournament?: { name: string } }).tournament?.name ?? "giải đấu";
    const tournamentSlug = (match as { tournament?: { slug: string } }).tournament?.slug ?? "";

    const captainIds = [match.team_a.captain_id, match.team_b.captain_id].filter(Boolean);
    await createNotifications(captainIds.map((userId) => ({
      user_id: userId,
      type: "match_scheduled",
      title: "Trận đấu đã được lên lịch",
      body: `${(match.team_a as { name: string }).name} vs ${(match.team_b as { name: string }).name} — ${scheduledDate} — ${tournamentName}`,
      entity_type: "match",
      entity_id: id,
      entity_url: tournamentSlug ? `/tournaments/${tournamentSlug}` : undefined,
    })));
  }

  return NextResponse.json(match);
}
