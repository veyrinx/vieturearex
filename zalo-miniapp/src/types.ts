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

// Hồ sơ người dùng đang đăng nhập (từ GET /api/user/profile).
export type MyProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_verified: boolean;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  ff_id: string | null;
  points: number;
  views: number;
  created_at: string;
};

// ── Diễn đàn (forum) ──────────────────────────────────
export type ForumPost = {
  id: string;
  title: string;
  category: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  view_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  role?: string | null;
  is_verified?: boolean;
};

export type ForumPostDetail = ForumPost & {
  content: string;
  helpful_count: number;
};

export type ForumReply = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  parent_id: string | null;
  created_at: string;
  role?: string | null;
  is_verified?: boolean;
};

// Thông báo (từ GET /api/notifications).
export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_url: string | null;
  read_at: string | null;
  created_at: string;
};

// Dữ liệu cập nhật hồ sơ (PATCH /api/user/profile).
export type ProfileUpdate = {
  display_name?: string;
  bio?: string;
  ff_id?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
};
