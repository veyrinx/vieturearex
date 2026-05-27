export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  points: number;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "newcomer",
    name: "Thành Viên Mới",
    description: "Chào mừng đến với cộng đồng Arex!",
    icon: "🎉",
    rarity: "common",
    points: 10,
  },
  {
    id: "profile_complete",
    name: "Hồ Sơ Hoàn Chỉnh",
    description: "Điền đầy đủ avatar, bio và ID Free Fire.",
    icon: "✅",
    rarity: "common",
    points: 20,
  },
  {
    id: "social_linked",
    name: "Kết Nối Xã Hội",
    description: "Liên kết ít nhất 2 mạng xã hội vào hồ sơ.",
    icon: "🔗",
    rarity: "uncommon",
    points: 15,
  },
  {
    id: "two_fa",
    name: "Bảo Vệ Tài Khoản",
    description: "Kích hoạt xác thực 2 yếu tố (2FA).",
    icon: "🛡️",
    rarity: "uncommon",
    points: 25,
  },
  {
    id: "verified",
    name: "Đã Xác Minh",
    description: "Được xác minh bởi đội ngũ Arex.",
    icon: "✔️",
    rarity: "rare",
    points: 50,
  },
  {
    id: "first_comment",
    name: "Lần Đầu Góp Giọng",
    description: "Để lại bình luận đầu tiên.",
    icon: "💬",
    rarity: "common",
    points: 10,
  },
  {
    id: "reader_10",
    name: "Độc Giả",
    description: "Đọc 10 bài viết.",
    icon: "📰",
    rarity: "common",
    points: 10,
  },
  {
    id: "reader_50",
    name: "Người Đam Mê Tin Tức",
    description: "Đọc 50 bài viết.",
    icon: "📚",
    rarity: "uncommon",
    points: 30,
  },
  {
    id: "bookmarker",
    name: "Bộ Sưu Tập",
    description: "Lưu 5 bài viết vào yêu thích.",
    icon: "🔖",
    rarity: "common",
    points: 15,
  },
  {
    id: "tournament_debut",
    name: "Tân Binh Thi Đấu",
    description: "Tham gia giải đấu đầu tiên.",
    icon: "🏆",
    rarity: "uncommon",
    points: 30,
  },
  {
    id: "gold_rank",
    name: "Đẳng Cấp Gold",
    description: "Đạt hạng Gold (500+ điểm).",
    icon: "🥇",
    rarity: "rare",
    points: 0,
  },
  {
    id: "diamond_rank",
    name: "Đẳng Cấp Diamond",
    description: "Đạt hạng Diamond (5000+ điểm).",
    icon: "💎",
    rarity: "epic",
    points: 0,
  },
  {
    id: "master_rank",
    name: "Huyền Thoại",
    description: "Đạt hạng Master (10000+ điểm).",
    icon: "👑",
    rarity: "legendary",
    points: 0,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a]),
) as Record<string, AchievementDef>;

export const RARITY_META: Record<AchievementRarity, { label: string; color: string; bg: string }> = {
  common:    { label: "Phổ Thông",  color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/30" },
  uncommon:  { label: "Hiếm",       color: "text-green-400",   bg: "bg-green-400/10 border-green-400/30" },
  rare:      { label: "Quý",        color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/30" },
  epic:      { label: "Sử Thi",     color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/30" },
  legendary: { label: "Huyền Thoại", color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30" },
};
