export type EventStatus = "active" | "upcoming" | "expired";

export type StreamStatus = "live" | "upcoming" | "ended";

export type StreamItem = {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  scheduled_at: string;
  status: StreamStatus;
  category: string;
  created_at: string;
};

export type PublishStatus = "draft" | "published";

export type GameProfile = {
  game: string;       // GameKey or free-form when game === "other"
  custom_label?: string; // populated when game === "other"
  uid: string;
  nickname?: string;
};

export type UserRole = "super_admin" | "admin" | "it" | "manager" | "support" | "team_member" | "user";

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
  created_by_name: string | null;
  updated_by_name: string | null;
};

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  status: PublishStatus;
  created_at: string;
  created_by_name: string | null;
};

export type NewsCommentItem = {
  id: string;
  news_id: string;
  user_id: string | null;
  display_name: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  parent_id: string | null;
  created_at: string;
};

export type SupportSession = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  display_name: string;
  status: "open" | "closed";
  last_message_at: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  session_id: string;
  sender_type: "user" | "admin";
  sender_name: string;
  content: string;
  created_at: string;
};

export type AnalyticsDailyItem = {
  date: string;
  views: number;
  unique_visitors: number;
  updated_at: string;
};

export type GalleryItem = {
  id: string;
  image_url: string;
  tag: string;
  created_at: string;
};

export type UserItem = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  views: number;
  is_banned: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
};

export type InvitedEmailItem = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
};

export type ActiveAdminItem = {
  id: string;
  email: string;
  last_seen: string;
};

export type AdminActivityLogItem = {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary: string;
  ip?: string | null;
  created_at: string;
};

export type SiteSetting = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
};

export type DashboardStats = {
  users: number;
  events: number;
  news: number;
  views: number;
};

export type PublicUserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
  bio?: string | null;
  phone?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
  discord_url?: string | null;
  twitch_url?: string | null;
  twitter_url?: string | null;
  telegram_url?: string | null;
  zalo_url?: string | null;
  threads_url?: string | null;
  github_url?: string | null;
  game_profiles?: GameProfile[] | null;
  last_seen_at?: string | null;
  show_in_team?: boolean;
  points?: number;
  rank?: string;
  views?: number;
};
