export type TmsMode = "1v1" | "2v2" | "4v4" | "squad";
export type TmsFormat = "round_robin" | "knockout" | "hybrid";
export type TmsTournamentStatus = "draft" | "registering" | "ongoing" | "finished" | "cancelled";
export type TmsMatchStatus = "pending" | "playing" | "done" | "cancelled";
export type TmsRegStatus = "pending" | "approved" | "rejected";

export type TmsTeam = {
  id: string;
  name: string;
  tag: string;
  captain_id: string;
  logo_url: string | null;
  total_points: number;
  total_kills: number;
  created_at: string;
};

export type TmsTeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
  user?: { display_name: string | null; email: string };
};

export type TmsTournament = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: TmsMode;
  format: TmsFormat;
  max_teams: number;
  team_size: number;
  prize_pool: string | null;
  rules: string | null;
  banner_url: string | null;
  status: TmsTournamentStatus;
  registration_open_at: string | null;
  registration_close_at: string | null;
  start_at: string | null;
  end_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type TmsRegistration = {
  id: string;
  tournament_id: string;
  team_id: string;
  status: TmsRegStatus;
  group_label: string | null;
  registered_at: string;
  team?: TmsTeam;
};

export type TmsMatch = {
  id: string;
  tournament_id: string;
  round: string;
  round_num: number;
  team_a_id: string;
  team_b_id: string;
  scheduled_at: string | null;
  status: TmsMatchStatus;
  winner_id: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
  team_a?: Pick<TmsTeam, "id" | "name" | "tag" | "logo_url">;
  team_b?: Pick<TmsTeam, "id" | "name" | "tag" | "logo_url">;
  winner?: Pick<TmsTeam, "id" | "name" | "tag"> | null;
};

export type TmsMatchResult = {
  id: string;
  match_id: string;
  tournament_id: string;
  team_id: string;
  user_id: string;
  kills: number;
  assists: number;
  deaths: number;
  is_winner: boolean;
  points: number;
  created_at: string;
  user?: { display_name: string | null };
  team?: Pick<TmsTeam, "id" | "name" | "tag">;
};

export type TmsPlayerLeaderboard = {
  tournament_id: string;
  user_id: string;
  display_name: string | null;
  team_id: string;
  team_name: string;
  team_tag: string;
  matches_played: number;
  total_kills: number;
  total_assists: number;
  total_deaths: number;
  total_points: number;
  wins: number;
  kd_ratio: number;
};

export type TmsTeamLeaderboard = {
  tournament_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  total_kills: number;
  total_assists: number;
  total_points: number;
};

// Input types for API
export type CreateTeamInput = { name: string; tag: string; logo_url?: string };
export type CreateTournamentInput = Omit<TmsTournament, "id" | "created_at" | "created_by">;
export type CreateMatchInput = Pick<TmsMatch, "tournament_id" | "round" | "round_num" | "team_a_id" | "team_b_id" | "scheduled_at">;
export type SubmitResultInput = {
  match_id: string;
  tournament_id: string;
  winner_id: string;
  proof_url?: string;
  players: Array<{
    user_id: string;
    team_id: string;
    kills: number;
    assists: number;
    deaths: number;
  }>;
};

export const MODE_LABELS: Record<TmsMode, string> = {
  "1v1": "1v1",
  "2v2": "2v2",
  "4v4": "4v4",
  squad: "Squad (5+)",
};

export const FORMAT_LABELS: Record<TmsFormat, string> = {
  round_robin: "Round Robin",
  knockout: "Knockout",
  hybrid: "Hybrid (Bảng → Knockout)",
};

export const STATUS_LABELS: Record<TmsTournamentStatus, string> = {
  draft: "Nháp",
  registering: "Đăng ký",
  ongoing: "Đang diễn ra",
  finished: "Kết thúc",
  cancelled: "Huỷ",
};

export const MATCH_STATUS_LABELS: Record<TmsMatchStatus, string> = {
  pending: "Chờ",
  playing: "Đang đấu",
  done: "Hoàn thành",
  cancelled: "Huỷ",
};
