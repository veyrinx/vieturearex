import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsRegistrations, bulkCreateMatches, deleteTournamentMatches } from "@/lib/tms/data";
import type { CreateMatchInput } from "@/lib/tms/types";

type GenerateBody = {
  format: "round_robin" | "knockout" | "hybrid";
  group_size?: number; // for hybrid, teams per group (default 4)
  replace?: boolean;   // delete pending matches first
};

function generateRoundRobin(
  teams: string[],
  tournamentId: string,
  roundLabel = "Vòng bảng",
  roundNum = 1,
): Omit<CreateMatchInput, never>[] {
  const matches: Omit<CreateMatchInput, never>[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        round: roundLabel,
        round_num: roundNum,
        team_a_id: teams[i],
        team_b_id: teams[j],
        scheduled_at: null,
      });
    }
  }
  return matches;
}

function generateKnockout(
  teams: string[],
  tournamentId: string,
): Omit<CreateMatchInput, never>[] {
  const n = teams.length;
  const matches: Omit<CreateMatchInput, never>[] = [];
  const half = Math.floor(n / 2);
  const label = roundName(n);
  for (let i = 0; i < half; i++) {
    matches.push({
      tournament_id: tournamentId,
      round: label,
      round_num: 1,
      team_a_id: teams[i],
      team_b_id: teams[n - 1 - i],
      scheduled_at: null,
    });
  }
  return matches;
}

function roundName(totalTeams: number): string {
  if (totalTeams <= 2) return "Chung kết";
  if (totalTeams <= 4) return "Bán kết";
  if (totalTeams <= 8) return "Tứ kết";
  if (totalTeams <= 16) return "Vòng 1/8";
  return "Vòng loại";
}

function generateHybrid(
  teams: string[],
  tournamentId: string,
  groupSize: number,
): Omit<CreateMatchInput, never>[] {
  const matches: Omit<CreateMatchInput, never>[] = [];
  const groupLabels = "ABCDEFGHIJ".split("");
  let gi = 0;
  for (let start = 0; start < teams.length; start += groupSize) {
    const group = teams.slice(start, start + groupSize);
    const label = `Bảng ${groupLabels[gi] ?? gi + 1}`;
    const rr = generateRoundRobin(group, tournamentId, label, gi + 1);
    matches.push(...rr);
    gi++;
  }
  return matches;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id: tournamentId } = await params;
  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const { format = "round_robin", group_size = 4, replace = false } = body;

  const registrations = await getTmsRegistrations(tournamentId).catch(() => []);
  const approved = registrations.filter((r) => r.status === "approved");
  if (approved.length < 2) {
    return NextResponse.json({ error: "Cần ít nhất 2 đội được duyệt." }, { status: 400 });
  }

  const teamIds = approved.map((r) => r.team_id);

  if (replace) {
    await deleteTournamentMatches(tournamentId);
  }

  let matchInputs: Omit<CreateMatchInput, never>[] = [];
  if (format === "round_robin") {
    matchInputs = generateRoundRobin(teamIds, tournamentId);
  } else if (format === "knockout") {
    matchInputs = generateKnockout(teamIds, tournamentId);
  } else {
    const gs = Math.max(2, Math.min(group_size, teamIds.length));
    matchInputs = generateHybrid(teamIds, tournamentId, gs);
  }

  const matches = await bulkCreateMatches(matchInputs, auth.userId);
  return NextResponse.json({ matches, count: matches.length }, { status: 201 });
}
