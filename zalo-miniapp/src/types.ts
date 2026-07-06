// Các type khớp với response API công khai của site Arex.

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  category: string;
  created_at: string;
  created_by_name: string | null;
};

export type EventStatus = "active" | "upcoming" | "expired";

export type EventItem = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  image_url: string;
  thumbnail_url?: string;
  link: string | null;
  status: EventStatus;
  view_count: number;
};

export type TournamentItem = {
  id: string;
  name: string;
  mode: string;
  max_teams: number;
  prize_pool?: string | null;
  status: string;
};

export type PlayerRank = {
  user_id: string;
  display_name: string;
  ff_id: string | null;
  team_name: string | null;
  team_tag: string | null;
  total_kills: number;
  total_points: number;
  matches_played: number;
  wins: number;
  kd_ratio: number;
};
