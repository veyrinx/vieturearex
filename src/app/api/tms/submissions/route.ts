import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createScoreSubmission, getScoreSubmissions, getUserSubmissions, getUserWeeklySubmissionCount } from "@/lib/tms/data";
import { getSettings } from "@/lib/data/content-service";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournament_id");
  const quotaOnly = searchParams.get("quota") === "true";

  const adminRoles = ["super_admin", "admin", "it", "manager", "support"];
  const isAdmin = adminRoles.includes(auth.role);

  if (quotaOnly) {
    const [used, settings] = await Promise.all([
      getUserWeeklySubmissionCount(auth.userId).catch(() => 0),
      getSettings().catch(() => []),
    ]);
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json({
      used,
      limit: Math.max(1, parseInt(settingsMap["tms.free_per_week"] ?? "4", 10) || 4),
      payment_price: settingsMap["tms.payment_price"] ?? "",
      payment_info: settingsMap["tms.payment_info"] ?? "",
      payment_qr_url: settingsMap["tms.payment_qr_url"] ?? "",
    });
  }

  if (isAdmin && tournamentId) {
    const subs = await getScoreSubmissions(tournamentId).catch(() => []);
    return NextResponse.json(subs);
  }

  const subs = await getUserSubmissions(auth.userId).catch(() => []);
  const filtered = tournamentId ? subs.filter((s) => s.tournament_id === tournamentId) : subs;
  return NextResponse.json(filtered);
}

type PlayerInput = { ff_id: string; display_name?: string; kills: number; assists: number; deaths: number; damage: number };

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
    damage?: number;
    proof_url?: string | null;
    notes?: string | null;
    players?: PlayerInput[];
  };

  if (!body.tournament_id) {
    return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  }

  const isBatch = Array.isArray(body.players) && body.players.length > 0;
  if (!isBatch && !body.ff_id) {
    return NextResponse.json({ error: "ff_id required" }, { status: 400 });
  }

  // Quota check — skip for admins
  const adminRoles = ["super_admin", "admin", "it", "manager", "support"];
  if (!adminRoles.includes(auth.role)) {
    const [used, settings] = await Promise.all([
      getUserWeeklySubmissionCount(auth.userId).catch(() => 0),
      getSettings().catch(() => []),
    ]);
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const limit = Math.max(1, parseInt(settingsMap["tms.free_per_week"] ?? "4", 10) || 4);
    if (used >= limit) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          used,
          limit,
          payment_price: settingsMap["tms.payment_price"] ?? "",
          payment_info: settingsMap["tms.payment_info"] ?? "",
          payment_qr_url: settingsMap["tms.payment_qr_url"] ?? "",
        },
        { status: 402 },
      );
    }
  }

  try {
    if (isBatch) {
      const results = await Promise.all(
        (body.players as PlayerInput[]).map((p) =>
          createScoreSubmission(
            {
              tournament_id: body.tournament_id!,
              match_id: body.match_id ?? null,
              team_id: body.team_id ?? null,
              ff_id: p.ff_id,
              kills: p.kills ?? 0,
              assists: p.assists ?? 0,
              deaths: p.deaths ?? 0,
              damage: p.damage ?? 0,
              proof_url: body.proof_url ?? null,
              notes: body.notes ?? null,
            },
            auth.userId!,
          )
        )
      );
      return NextResponse.json(results, { status: 201 });
    }

    const sub = await createScoreSubmission(
      {
        tournament_id: body.tournament_id,
        match_id: body.match_id ?? null,
        team_id: body.team_id ?? null,
        ff_id: body.ff_id!,
        kills: body.kills ?? 0,
        assists: body.assists ?? 0,
        deaths: body.deaths ?? 0,
        damage: body.damage ?? 0,
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
