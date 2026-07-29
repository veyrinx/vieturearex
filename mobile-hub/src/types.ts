/** Kiểu dữ liệu khớp với response của `arexnetwork.site/api/*`. */

export type UserRole =
  | "super_admin"
  | "admin"
  | "it"
  | "manager"
  | "support"
  | "team_member"
  | "user";

/** Các vai trò được phép mở Arex Hub. */
export const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support"];

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  it: "IT",
  manager: "Manager",
  support: "Support",
  team_member: "Thành viên đội",
  user: "Người dùng",
};

/** Bậc quyền — dùng để ẩn thao tác vượt cấp ngay trên giao diện. */
export const ROLE_LEVEL: Record<string, number> = {
  super_admin: 200,
  it: 150,
  admin: 100,
  manager: 60,
  support: 40,
  team_member: 30,
  user: 20,
};

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  status: "draft" | "published";
  created_at: string;
  created_by_name: string | null;
  scheduled_at?: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  image_url: string;
  thumbnail_url?: string;
  server_region?: string | null;
  link: string | null;
  status: "active" | "upcoming" | "expired";
  view_count: number;
  created_by_name: string | null;
  updated_by_name: string | null;
};

export type GalleryItem = {
  id: string;
  image_url: string;
  tag: string;
  created_at: string;
};

export type CommentTable = "news_comments" | "event_comments";
export type CommentStatus = "pending" | "approved" | "rejected";

export type CommentItem = {
  id: string;
  content: string;
  status: CommentStatus;
  display_name: string | null;
  user_id: string | null;
  news_id?: string | null;
  event_id?: string | null;
  created_at: string;
};

export type ForumKind = "posts" | "replies";

export type ForumItem = {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  is_pinned?: boolean | null;
  is_locked?: boolean | null;
  author_name?: string | null;
  user_id?: string | null;
  created_at: string;
  [key: string]: unknown;
};

export type UserItem = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  badges?: string[];
  views: number;
  is_banned: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary: string;
  ip?: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type StatsResponse = {
  chart: { date: string; views: number }[];
  byYear: { key: string; views: number }[];
  byMonth: { key: string; views: number }[];
  totalViews: number;
  topNews: { id: string; title: string; slug: string; comments: number }[];
  leaderboard: unknown[];
};

export type AppPlatform = "android" | "ios";

export type AppRelease = {
  path: string;
  platform: AppPlatform;
  version: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string | null;
};

/** Thông báo cá nhân của tài khoản đang đăng nhập (GET /api/notifications). */
export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_url: string | null;
  read_at: string | null;
  created_at: string;
};

/** Một dòng cài đặt site. Khoá bí mật bị server thay bằng mặt nạ trước khi trả về. */
export type SiteSetting = {
  id?: string;
  key: string;
  value: string;
};
