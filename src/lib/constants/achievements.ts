export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type AchievementCategory = "account" | "content" | "forum" | "wiki" | "tournament" | "rank" | "social" | "loyalty";

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  points: number;
  hidden?: boolean;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── ACCOUNT ───────────────────────────────────────────────────────────────
  {
    id: "newcomer",
    name: "Thành Viên Mới",
    description: "Chào mừng đến với cộng đồng Arex!",
    icon: "🎉", rarity: "common", category: "account", points: 10,
  },
  {
    id: "profile_complete",
    name: "Hồ Sơ Hoàn Chỉnh",
    description: "Điền đầy đủ avatar, bio và ID Free Fire.",
    icon: "✅", rarity: "common", category: "account", points: 20,
  },
  {
    id: "social_linked",
    name: "Kết Nối Xã Hội",
    description: "Liên kết ít nhất 2 mạng xã hội vào hồ sơ.",
    icon: "🔗", rarity: "uncommon", category: "account", points: 15,
  },
  {
    id: "two_fa",
    name: "Bảo Vệ Tài Khoản",
    description: "Kích hoạt xác thực 2 yếu tố (2FA).",
    icon: "🛡️", rarity: "uncommon", category: "account", points: 25,
  },
  {
    id: "verified",
    name: "Đã Xác Minh",
    description: "Được xác minh bởi đội ngũ Arex.",
    icon: "✔️", rarity: "rare", category: "account", points: 50,
  },

  // ── CONTENT ───────────────────────────────────────────────────────────────
  {
    id: "first_comment",
    name: "Lần Đầu Góp Giọng",
    description: "Để lại bình luận đầu tiên.",
    icon: "💬", rarity: "common", category: "content", points: 10,
  },
  {
    id: "reader_10",
    name: "Độc Giả",
    description: "Đọc 10 bài viết.",
    icon: "📰", rarity: "common", category: "content", points: 10,
  },
  {
    id: "reader_50",
    name: "Người Đam Mê Tin Tức",
    description: "Đọc 50 bài viết.",
    icon: "📚", rarity: "uncommon", category: "content", points: 30,
  },
  {
    id: "reader_100",
    name: "Mọt Sách",
    description: "Đọc 100 bài viết.",
    icon: "🏛️", rarity: "rare", category: "content", points: 60,
  },
  {
    id: "bookmarker",
    name: "Bộ Sưu Tập",
    description: "Lưu 5 bài viết vào yêu thích.",
    icon: "🔖", rarity: "common", category: "content", points: 15,
  },
  {
    id: "bookmarker_20",
    name: "Thư Viện Cá Nhân",
    description: "Lưu 20 bài viết vào yêu thích.",
    icon: "📂", rarity: "uncommon", category: "content", points: 25,
  },

  // ── FORUM ─────────────────────────────────────────────────────────────────
  {
    id: "forum_first_post",
    name: "Nhà Diễn Thuyết",
    description: "Đăng bài viết đầu tiên trên diễn đàn.",
    icon: "🎤", rarity: "common", category: "forum", points: 15,
  },
  {
    id: "forum_10_posts",
    name: "Giọng Nói Nổi Bật",
    description: "Đăng 10 bài viết trên diễn đàn.",
    icon: "📣", rarity: "uncommon", category: "forum", points: 30,
  },
  {
    id: "forum_50_posts",
    name: "Người Hùng Diễn Đàn",
    description: "Đăng 50 bài viết trên diễn đàn.",
    icon: "🦁", rarity: "rare", category: "forum", points: 75,
  },
  {
    id: "forum_100_posts",
    name: "Truyền Thuyết Diễn Đàn",
    description: "Đăng 100 bài viết trên diễn đàn.",
    icon: "🌟", rarity: "epic", category: "forum", points: 150,
  },
  {
    id: "forum_first_reply",
    name: "Chào Đón Nhau",
    description: "Trả lời bài viết đầu tiên của người khác.",
    icon: "💌", rarity: "common", category: "forum", points: 10,
  },
  {
    id: "forum_popular",
    name: "Bài Hot",
    description: "Có bài viết nhận được 10+ trả lời.",
    icon: "🔥", rarity: "rare", category: "forum", points: 40,
  },

  // ── WIKI ──────────────────────────────────────────────────────────────────
  {
    id: "wiki_first_article",
    name: "Người Đóng Góp",
    description: "Xuất bản bài viết wiki đầu tiên.",
    icon: "✍️", rarity: "uncommon", category: "wiki", points: 40,
  },
  {
    id: "wiki_3_articles",
    name: "Nhà Bách Khoa",
    description: "Xuất bản 3 bài viết wiki.",
    icon: "📖", rarity: "rare", category: "wiki", points: 80,
  },
  {
    id: "wiki_10_articles",
    name: "Học Giả Cộng Đồng",
    description: "Xuất bản 10 bài viết wiki.",
    icon: "🎓", rarity: "epic", category: "wiki", points: 200,
  },

  // ── TOURNAMENT ────────────────────────────────────────────────────────────
  {
    id: "tournament_debut",
    name: "Tân Binh Thi Đấu",
    description: "Tham gia giải đấu đầu tiên.",
    icon: "🏆", rarity: "uncommon", category: "tournament", points: 30,
  },
  {
    id: "tms_5_tournaments",
    name: "Chiến Binh Dày Dạn",
    description: "Tham gia 5 giải đấu.",
    icon: "⚔️", rarity: "rare", category: "tournament", points: 50,
  },
  {
    id: "tms_10_tournaments",
    name: "Huyền Thoại Sàn Đấu",
    description: "Tham gia 10 giải đấu.",
    icon: "🗡️", rarity: "epic", category: "tournament", points: 100,
  },
  {
    id: "tms_first_win",
    name: "Chiến Thắng Đầu Tiên",
    description: "Giành chiến thắng trận đấu đầu tiên.",
    icon: "🎯", rarity: "uncommon", category: "tournament", points: 30,
  },
  {
    id: "tms_top_3",
    name: "Vinh Quang Đỉnh Cao",
    description: "Vào top 3 trong một giải đấu.",
    icon: "🥇", rarity: "rare", category: "tournament", points: 40,
  },
  {
    id: "tms_100_kills",
    name: "Sát Thủ",
    description: "Tích lũy 100 kills trong các giải đấu.",
    icon: "🔫", rarity: "rare", category: "tournament", points: 0,
  },
  {
    id: "tms_500_kills",
    name: "Thần Sát",
    description: "Tích lũy 500 kills trong các giải đấu.",
    icon: "💀", rarity: "epic", category: "tournament", points: 0,
  },
  {
    id: "tms_1000_kills",
    name: "Vị Thần Chiến Trường",
    description: "Tích lũy 1000 kills trong các giải đấu.",
    icon: "🩸", rarity: "legendary", category: "tournament", points: 0,
  },
  {
    id: "tms_10_wins",
    name: "Bất Khả Chiến Bại",
    description: "Giành chiến thắng 10 trận đấu.",
    icon: "🏅", rarity: "epic", category: "tournament", points: 0,
  },

  // ── RANK ──────────────────────────────────────────────────────────────────
  {
    id: "silver_rank",
    name: "Đẳng Cấp Silver",
    description: "Đạt hạng Silver (100+ điểm).",
    icon: "🥈", rarity: "common", category: "rank", points: 0,
  },
  {
    id: "gold_rank",
    name: "Đẳng Cấp Gold",
    description: "Đạt hạng Gold (500+ điểm).",
    icon: "🥇", rarity: "rare", category: "rank", points: 0,
  },
  {
    id: "platinum_rank",
    name: "Đẳng Cấp Platinum",
    description: "Đạt hạng Platinum (1000+ điểm).",
    icon: "💠", rarity: "rare", category: "rank", points: 0,
  },
  {
    id: "diamond_rank",
    name: "Đẳng Cấp Diamond",
    description: "Đạt hạng Diamond (5000+ điểm).",
    icon: "💎", rarity: "epic", category: "rank", points: 0,
  },
  {
    id: "master_rank",
    name: "Huyền Thoại",
    description: "Đạt hạng Master (10000+ điểm).",
    icon: "👑", rarity: "legendary", category: "rank", points: 0,
  },
  {
    id: "grandmaster_rank",
    name: "Siêu Huyền Thoại",
    description: "Đạt hạng Grandmaster (25000+ điểm).",
    icon: "🔮", rarity: "legendary", category: "rank", points: 0,
  },
  {
    id: "challenger_rank",
    name: "Kẻ Thách Đấu",
    description: "Đạt hạng Challenger (50000+ điểm) — đỉnh cao tuyệt đối.",
    icon: "⚡", rarity: "legendary", category: "rank", points: 0,
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    id: "first_follow",
    name: "Người Kết Nối",
    description: "Theo dõi chuyên mục hoặc người chơi đầu tiên.",
    icon: "👥", rarity: "common", category: "social", points: 10,
  },
  {
    id: "followed_5",
    name: "Nhà Thám Hiểm",
    description: "Theo dõi 5 chuyên mục hoặc người chơi.",
    icon: "🗺️", rarity: "common", category: "social", points: 15,
  },

  // ── LOYALTY ───────────────────────────────────────────────────────────────
  {
    id: "login_7_days",
    name: "Ngọn Lửa Không Tắt",
    description: "Đăng nhập 7 ngày liên tiếp.",
    icon: "🔥", rarity: "uncommon", category: "loyalty", points: 20,
  },
  {
    id: "login_30_days",
    name: "Trung Thành Tuyệt Đối",
    description: "Đăng nhập 30 ngày liên tiếp.",
    icon: "❤️‍🔥", rarity: "rare", category: "loyalty", points: 60,
  },
  {
    id: "early_member",
    name: "Người Tiên Phong",
    description: "Tham gia Arex trong giai đoạn đầu ra mắt.",
    icon: "🚀", rarity: "epic", category: "loyalty", points: 100, hidden: true,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a]),
) as Record<string, AchievementDef>;

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { label: string; icon: string }> = {
  account:    { label: "Tài Khoản",  icon: "👤" },
  content:    { label: "Nội Dung",   icon: "📰" },
  forum:      { label: "Diễn Đàn",   icon: "💬" },
  wiki:       { label: "Wiki",        icon: "📖" },
  tournament: { label: "Giải Đấu",   icon: "🏆" },
  rank:       { label: "Hạng",        icon: "⭐" },
  social:     { label: "Xã Hội",     icon: "🤝" },
  loyalty:    { label: "Trung Thành", icon: "❤️" },
};

export const RARITY_META: Record<AchievementRarity, { label: string; color: string; bg: string; glow: string }> = {
  common:    { label: "Phổ Thông",   color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/30",  glow: "" },
  uncommon:  { label: "Hiếm",        color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30",  glow: "shadow-green-500/20" },
  rare:      { label: "Quý",         color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",    glow: "shadow-blue-500/20" },
  epic:      { label: "Sử Thi",      color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", glow: "shadow-purple-500/20" },
  legendary: { label: "Huyền Thoại", color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  glow: "shadow-amber-500/25" },
};
