/**
 * Kiểu dữ liệu Craftland dùng chung cho server lẫn client.
 * Bảng gốc: supabase/migration-craftland.sql
 */

export type CraftlandMapStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "hidden"
  | "archived"
  | "removed";

export type CraftlandVerificationStatus = "none" | "pending" | "verified" | "rejected" | "revoked";

export type CraftlandPlatform = "mobile" | "pc";

export type CraftlandLink = { label: string; url: string };

export type CraftlandCategory = {
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type CraftlandCreator = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  social_links: CraftlandLink[];
  can_publish: boolean;
  status: "active" | "suspended";
  suspended_reason: string | null;
  verification_status: CraftlandVerificationStatus;
  verified_at: string | null;
  follower_count: number;
  created_at: string;
};

/** Phần creator gắn vào card / trang chi tiết bản đồ. */
export type CraftlandCreatorSummary = Pick<
  CraftlandCreator,
  "user_id" | "username" | "display_name" | "avatar_url" | "verification_status"
>;

export type CraftlandMap = {
  id: string;
  slug: string;
  creator_id: string;
  title: string;
  summary: string;
  description: string;
  category_slug: string;
  tags: string[];
  map_code: string | null;
  platforms: CraftlandPlatform[];
  platforms_verified: boolean;
  cover_url: string | null;
  gallery: string[];
  video_url: string | null;
  how_to_play: string;
  status: CraftlandMapStatus;
  moderation_note: string | null;
  is_featured: boolean;
  featured_rank: number;
  is_editor_pick: boolean;
  version: number;
  view_count: number;
  unique_view_count: number;
  copy_count: number;
  share_count: number;
  guide_open_count: number;
  favorite_count: number;
  rating_count: number;
  rating_sum: number;
  report_count: number;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CraftlandMapCard = Pick<
  CraftlandMap,
  | "id" | "slug" | "title" | "summary" | "category_slug" | "map_code" | "cover_url" | "tags"
  | "view_count" | "favorite_count" | "rating_count" | "rating_sum" | "published_at"
  | "is_editor_pick" | "is_featured"
> & { creator: CraftlandCreatorSummary | null };

export type CraftlandVerificationRequest = {
  id: string;
  creator_id: string;
  display_name: string;
  about: string;
  public_links: CraftlandLink[];
  evidence: string;
  status: "pending" | "needs_info" | "approved" | "rejected" | "withdrawn";
  review_notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CraftlandReportReason =
  | "wrong_info" | "wrong_code" | "duplicate" | "stolen" | "inappropriate" | "other";

export type CraftlandReport = {
  id: string;
  map_id: string;
  reporter_id: string | null;
  reason: CraftlandReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  handled_by: string | null;
  handled_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

export type CraftlandEventType = "view" | "copy_code" | "share" | "guide_open";

export type CraftlandDailyRow = {
  map_id: string;
  day: string;
  views: number;
  unique_visitors: number;
  copies: number;
  shares: number;
  guide_opens: number;
  favorites: number;
};

export type CraftlandAcademyCategory = {
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

export type CraftlandAcademyArticle = {
  id: string;
  slug: string;
  category_slug: string;
  title: string;
  excerpt: string;
  body: string;
  platform: "pc" | "mobile" | "both";
  sources: CraftlandLink[];
  compat_warning: string | null;
  sort_order: number;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  updated_at: string;
};
