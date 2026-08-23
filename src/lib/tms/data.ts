import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { notifyRoundCompleted } from "@/lib/server/tms-live-notify";
import type {
  TmsTeam, TmsTeamMember, TmsTournament, TmsRegistration,
  TmsMatch, TmsMatchResult, TmsPlayerLeaderboard, TmsTeamLeaderboard,
  TmsScoreSubmission,
  CreateTeamInput, CreateTournamentInput, CreateMatchInput, SubmitResultInput,
} from "./types";

function getDb() {
  const admin = createAdminSupabaseClient();
  if (admin) return admin;
  const sb = createServerSupabaseClient();
  if (!sb) throw new Error("DB unavailable");
  return sb;
}

const u = (table: string) => untypedFrom(getDb(), table);

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function getTmsTeams(adminView = false): Promise<TmsTeam[]> {
  let q = u("tms_teams").select("*").order("total_points", { ascending: false });
  if (!adminView) q = q.eq("is_public", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TmsTeam[];
}

export async function joinTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await u("tms_team_members").insert({ team_id: teamId, user_id: userId });
  if (error) throw error;
}

export async function getTmsTeam(id: string): Promise<TmsTeam | null> {
  const { data } = await u("tms_teams").select("*").eq("id", id).single();
  return (data ?? null) as TmsTeam | null;
}

export async function getMyTmsTeam(userId: string): Promise<TmsTeam | null> {
  const { data } = await u("tms_team_members")
    .select("team:tms_teams(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as { team: TmsTeam };
  return row.team ?? null;
}

export async function getTmsTeamMembers(teamId: string): Promise<TmsTeamMember[]> {
  const { data, error } = await u("tms_team_members")
    .select("*, user:users(display_name, email)")
    .eq("team_id", teamId);
  if (error) throw error;
  return (data ?? []) as TmsTeamMember[];
}

export async function createTmsTeam(input: CreateTeamInput, captainId: string): Promise<TmsTeam> {
  const { data, error } = await u("tms_teams")
    .insert({ ...input, captain_id: captainId })
    .select()
    .single();
  if (error) throw error;
  const team = data as TmsTeam;
  await u("tms_team_members").insert({ team_id: team.id, user_id: captainId });
  return team;
}

// ── Tournaments ───────────────────────────────────────────────────────────────

export async function getTmsTournaments(adminView = false): Promise<TmsTournament[]> {
  let q = u("tms_tournaments").select("*").order("created_at", { ascending: false });
  if (!adminView) q = q.neq("status", "draft");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TmsTournament[];
}

export async function getTmsTournament(slug: string): Promise<TmsTournament | null> {
  const { data } = await u("tms_tournaments").select("*").eq("slug", slug).single();
  return (data ?? null) as TmsTournament | null;
}

export async function getTmsTournamentById(id: string): Promise<TmsTournament | null> {
  const { data } = await u("tms_tournaments").select("*").eq("id", id).single();
  return (data ?? null) as TmsTournament | null;
}

export async function createTmsTournament(input: Partial<CreateTournamentInput>, createdBy: string): Promise<TmsTournament> {
  const { data, error } = await u("tms_tournaments")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as TmsTournament;
}

export async function updateTmsTournament(id: string, input: Partial<TmsTournament>): Promise<TmsTournament> {
  const { data, error } = await u("tms_tournaments").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as TmsTournament;
}

// ── Registrations ─────────────────────────────────────────────────────────────

export async function getTmsRegistrations(tournamentId: string): Promise<TmsRegistration[]> {
  const { data, error } = await u("tms_registrations")
    .select("*, team:tms_teams(*)")
    .eq("tournament_id", tournamentId)
    .order("registered_at");
  if (error) throw error;
  return (data ?? []) as TmsRegistration[];
}

export async function registerTeam(tournamentId: string, teamId: string): Promise<TmsRegistration> {
  const { data, error } = await u("tms_registrations")
    .insert({ tournament_id: tournamentId, team_id: teamId })
    .select()
    .single();
  if (error) throw error;
  return data as TmsRegistration;
}

export async function updateRegistrationStatus(id: string, status: "approved" | "rejected", groupLabel?: string) {
  const { error } = await u("tms_registrations")
    .update({ status, ...(groupLabel ? { group_label: groupLabel } : {}) })
    .eq("id", id);
  if (error) throw error;
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function getTmsMatches(tournamentId: string): Promise<TmsMatch[]> {
  const { data, error } = await u("tms_matches")
    .select("*, team_a:tms_teams!tms_matches_team_a_id_fkey(id,name,tag,logo_url), team_b:tms_teams!tms_matches_team_b_id_fkey(id,name,tag,logo_url)")
    .eq("tournament_id", tournamentId)
    .order("round_num")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TmsMatch[];
}

export async function getTmsMatch(id: string): Promise<TmsMatch | null> {
  const { data } = await u("tms_matches")
    .select("*, team_a:tms_teams!tms_matches_team_a_id_fkey(id,name,tag,logo_url), team_b:tms_teams!tms_matches_team_b_id_fkey(id,name,tag,logo_url)")
    .eq("id", id)
    .single();
  return (data ?? null) as TmsMatch | null;
}

export async function createTmsMatch(input: CreateMatchInput, createdBy: string): Promise<TmsMatch> {
  const { data, error } = await u("tms_matches")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as TmsMatch;
}

export async function updateTmsMatchStatus(id: string, status: TmsMatch["status"]) {
  const { error } = await u("tms_matches").update({ status }).eq("id", id);
  if (error) throw error;
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function getTmsMatchResults(matchId: string): Promise<TmsMatchResult[]> {
  const { data, error } = await u("tms_match_results")
    .select("*, user:users(display_name), team:tms_teams(id,name,tag)")
    .eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as TmsMatchResult[];
}

export async function submitTmsResults(input: SubmitResultInput, submittedBy: string): Promise<void> {
  const rows = input.players.map((p) => ({
    match_id: input.match_id,
    tournament_id: input.tournament_id,
    team_id: p.team_id,
    user_id: p.user_id,
    kills: p.kills,
    assists: p.assists,
    deaths: p.deaths,
    is_winner: p.team_id === input.winner_id,
    submitted_by: submittedBy,
  }));

  const { error: resErr } = await u("tms_match_results").upsert(rows, { onConflict: "match_id,user_id" });
  if (resErr) throw resErr;

  const { error: matchErr } = await u("tms_matches")
    .update({ status: "done", winner_id: input.winner_id, proof_url: input.proof_url ?? null })
    .eq("id", input.match_id);
  if (matchErr) throw matchErr;

  // Vòng đấu vừa khép lại thì báo kênh Telegram cộng đồng (tự im nếu vòng còn
  // trận dang dở). Không await: kết quả đã lưu xong, Telegram chậm hay lỗi
  // không được giữ người nhập kết quả lại.
  void notifyRoundCompleted(input.tournament_id, input.match_id);
}

// ── Leaderboards ──────────────────────────────────────────────────────────────

export async function getTmsPlayerLeaderboard(tournamentId: string): Promise<TmsPlayerLeaderboard[]> {
  const { data, error } = await u("tms_player_leaderboard")
    .select("*").eq("tournament_id", tournamentId).order("total_points", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsPlayerLeaderboard[];
}

export async function getTmsTeamLeaderboard(tournamentId: string): Promise<TmsTeamLeaderboard[]> {
  const { data, error } = await u("tms_team_leaderboard")
    .select("*").eq("tournament_id", tournamentId).order("total_points", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsTeamLeaderboard[];
}

// ── Player career stats ───────────────────────────────────────────────────────

export type PlayerCareerRow = TmsPlayerLeaderboard & {
  tournament?: { id: string; name: string; slug: string; status: string };
};

export async function getTmsPlayerCareer(userId: string): Promise<PlayerCareerRow[]> {
  const { data, error } = await u("tms_player_leaderboard")
    .select("*, tournament:tms_tournaments(id,name,slug,status)")
    .eq("user_id", userId)
    .order("total_points", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlayerCareerRow[];
}

// ── Score Submissions ─────────────────────────────────────────────────────────

export async function createScoreSubmission(
  input: {
    tournament_id: string;
    match_id?: string | null;
    team_id?: string | null;
    ff_id: string;
    placement?: number | null;
    kills: number;
    assists: number;
    deaths: number;
    damage: number;
    proof_url?: string | null;
    notes?: string | null;
  },
  userId: string,
): Promise<TmsScoreSubmission> {
  const { data, error } = await u("tms_score_submissions")
    .insert({ ...input, user_id: userId })
    .select("*, user:users(display_name,ff_id), team:tms_teams(name,tag), match:tms_matches(round)")
    .single();
  if (error) throw error;
  return data as TmsScoreSubmission;
}

export async function getScoreSubmissions(tournamentId: string): Promise<TmsScoreSubmission[]> {
  const { data, error } = await u("tms_score_submissions")
    .select("*, user:users(display_name,ff_id), team:tms_teams(name,tag), match:tms_matches(round)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsScoreSubmission[];
}

export async function getUserWeeklySubmissionCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await u("tms_score_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function getUserSubmissions(userId: string): Promise<TmsScoreSubmission[]> {
  const { data, error } = await u("tms_score_submissions")
    .select("*, user:users(display_name,ff_id), team:tms_teams(name,tag), match:tms_matches(round)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsScoreSubmission[];
}

export async function reviewSubmission(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string,
): Promise<void> {
  const db = getDb();
  const { data: sub, error: fetchErr } = await untypedFrom(db, "tms_score_submissions")
    .select("match_id, tournament_id, user_id, team_id, kills, assists, deaths")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await untypedFrom(db, "tms_score_submissions")
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  if (status === "approved" && (sub as { match_id: string | null }).match_id) {
    const s = sub as {
      match_id: string;
      tournament_id: string;
      user_id: string;
      team_id: string | null;
      kills: number;
      assists: number;
      deaths: number;
    };
    const { error: upsertErr } = await untypedFrom(db, "tms_match_results").upsert(
      {
        match_id: s.match_id,
        tournament_id: s.tournament_id,
        user_id: s.user_id,
        team_id: s.team_id,
        kills: s.kills,
        assists: s.assists,
        deaths: s.deaths,
        is_winner: false,
        submitted_by: reviewedBy,
      },
      { onConflict: "match_id,user_id" },
    );
    if (upsertErr) throw upsertErr;
  }
}

// ── Team history ──────────────────────────────────────────────────────────────

export async function getTmsTeamMatchHistory(teamId: string): Promise<TmsMatch[]> {
  const { data, error } = await u("tms_matches")
    .select("*, team_a:tms_teams!tms_matches_team_a_id_fkey(id,name,tag,logo_url), team_b:tms_teams!tms_matches_team_b_id_fkey(id,name,tag,logo_url), tournament:tms_tournaments(id,name,slug,status)")
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
    .order("round_num")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TmsMatch[];
}

export async function getTmsTeamResultsByTournament(teamId: string): Promise<TmsTeamLeaderboard[]> {
  const { data, error } = await u("tms_team_leaderboard")
    .select("*, tournament:tms_tournaments(id,name,slug,status)")
    .eq("team_id", teamId)
    .order("total_points", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsTeamLeaderboard[];
}

export type TeamLeaderboardWithTournament = TmsTeamLeaderboard & {
  tournament?: { id: string; name: string; slug: string; status: string };
};

// ── Global leaderboards (all tournaments aggregated) ─────────────────────────

export type GlobalPlayerRow = {
  user_id: string;
  display_name: string | null;
  ff_id: string | null;
  team_id: string;
  team_name: string;
  team_tag: string;
  total_kills: number;
  total_assists: number;
  total_deaths: number;
  total_points: number;
  matches_played: number;
  wins: number;
  kd_ratio: number;
  tournaments_played: number;
};

export async function getGlobalPlayerLeaderboard(limit = 50): Promise<GlobalPlayerRow[]> {
  const { data, error } = await u("tms_player_leaderboard")
    .select("user_id,display_name,ff_id,team_id,team_name,team_tag,total_kills,total_assists,total_deaths,total_points,matches_played,wins");
  if (error) throw error;

  const byUser = new Map<string, GlobalPlayerRow>();
  for (const row of (data ?? []) as TmsPlayerLeaderboard[]) {
    const e = byUser.get(row.user_id);
    if (e) {
      e.total_kills += row.total_kills;
      e.total_assists += row.total_assists;
      e.total_deaths += row.total_deaths;
      e.total_points += row.total_points;
      e.matches_played += row.matches_played;
      e.wins += row.wins;
      e.tournaments_played++;
    } else {
      byUser.set(row.user_id, {
        user_id: row.user_id, display_name: row.display_name, ff_id: row.ff_id,
        team_id: row.team_id, team_name: row.team_name, team_tag: row.team_tag,
        total_kills: row.total_kills, total_assists: row.total_assists,
        total_deaths: row.total_deaths, total_points: row.total_points,
        matches_played: row.matches_played, wins: row.wins,
        kd_ratio: 0, tournaments_played: 1,
      });
    }
  }
  return Array.from(byUser.values())
    .map((r) => ({ ...r, kd_ratio: r.total_deaths > 0 ? +(r.total_kills / r.total_deaths).toFixed(2) : r.total_kills }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit);
}

export type GlobalTeamRow = TmsTeamLeaderboard & { tournaments_played: number };

export async function getGlobalTeamLeaderboard(limit = 50): Promise<GlobalTeamRow[]> {
  const { data, error } = await u("tms_team_leaderboard").select("*");
  if (error) throw error;

  const byTeam = new Map<string, GlobalTeamRow>();
  for (const row of (data ?? []) as TmsTeamLeaderboard[]) {
    const e = byTeam.get(row.team_id);
    if (e) {
      e.matches_played += row.matches_played;
      e.wins += row.wins;
      e.losses += row.losses;
      e.total_kills += row.total_kills;
      e.total_assists += row.total_assists;
      e.total_points += row.total_points;
      e.tournaments_played++;
    } else {
      byTeam.set(row.team_id, { ...row, tournaments_played: 1 });
    }
  }
  return Array.from(byTeam.values())
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit);
}

// ── Team tournament registrations ─────────────────────────────────────────────

export async function getTeamRegistrations(teamId: string): Promise<TmsRegistration[]> {
  const { data, error } = await u("tms_registrations")
    .select("*, tournament:tms_tournaments(id,name,slug,status,start_at,banner_url)")
    .eq("team_id", teamId)
    .order("registered_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TmsRegistration[];
}

export async function updateTeamInfo(
  teamId: string,
  captainId: string,
  input: { name?: string; logo_url?: string | null },
): Promise<TmsTeam> {
  const { data, error } = await u("tms_teams")
    .update(input)
    .eq("id", teamId)
    .eq("captain_id", captainId)
    .select()
    .single();
  if (error) throw error;
  return data as TmsTeam;
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const team = await getTmsTeam(teamId);
  if (team?.captain_id === userId) throw new Error("Captain không thể rời team. Hãy chuyển quyền trước.");
  const { error } = await u("tms_team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) throw error;
}

export async function kickMember(teamId: string, captainId: string, targetUserId: string): Promise<void> {
  const team = await getTmsTeam(teamId);
  if (!team || team.captain_id !== captainId) throw new Error("Chỉ captain mới kick được.");
  if (targetUserId === captainId) throw new Error("Không thể tự kick.");
  const { error } = await u("tms_team_members").delete().eq("team_id", teamId).eq("user_id", targetUserId);
  if (error) throw error;
}

// ── Bulk match create (bracket generation) ───────────────────────────────────

export async function bulkCreateMatches(
  rows: Omit<CreateMatchInput, never>[],
  createdBy: string,
): Promise<TmsMatch[]> {
  const { data, error } = await u("tms_matches")
    .insert(rows.map((r) => ({ ...r, created_by: createdBy })))
    .select("*, team_a:tms_teams!tms_matches_team_a_id_fkey(id,name,tag,logo_url), team_b:tms_teams!tms_matches_team_b_id_fkey(id,name,tag,logo_url)");
  if (error) throw error;
  return (data ?? []) as TmsMatch[];
}

export async function deleteTournamentMatches(tournamentId: string): Promise<void> {
  const { error } = await u("tms_matches").delete().eq("tournament_id", tournamentId).eq("status", "pending");
  if (error) throw error;
}
