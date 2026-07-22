import {
  Award,
  Bug,
  Crown,
  Flame,
  Gem,
  Handshake,
  HeartHandshake,
  Medal,
  Mic,
  PenLine,
  Rocket,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { BUILTIN_ROLE_LEVELS } from "@/lib/permissions";

/**
 * Nhãn người dùng (badges) — TÁCH RIÊNG khỏi role.
 *
 *   role   → quyền hạn. 1 user = 1 role. Xem @/lib/permissions + @/lib/constants/roles
 *   badges → hiển thị. 1 user = nhiều nhãn. Không cấp quyền gì cả.
 *
 * Thêm nhãn mới: chỉ cần thêm 1 entry ở đây, không cần migration DB
 * (cột users.badges là text[] tự do).
 */

export type BadgeGroup = "contribution" | "partner" | "community" | "achievement";

export const BADGE_GROUP_LABELS: Record<BadgeGroup, string> = {
  contribution: "Đóng góp",
  partner: "Đối tác",
  community: "Cộng đồng",
  achievement: "Thành tích",
};

export type UserBadgeMeta = {
  key: string;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  group: BadgeGroup;
  /** Tailwind: text + nền mờ */
  color: string;
  /** Tailwind: viền */
  border: string;
  /** Mô tả ngắn hiện trong admin + tooltip */
  description: string;
  /** Nhãn này tự động kéo theo tích xanh */
  verified?: boolean;
  /** Cấp role tối thiểu được phép gán / thu hồi nhãn này */
  minLevel: number;
};

const { super_admin, admin, manager, support } = BUILTIN_ROLE_LEVELS;

export const USER_BADGES: UserBadgeMeta[] = [
  // ── Đóng góp ──
  {
    key: "creator",
    label: "Nhà Sáng Tạo",
    labelEn: "Creator",
    icon: Sparkles,
    group: "contribution",
    color: "text-fuchsia-500 bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    description: "Sản xuất nội dung cho cộng đồng Arex.",
    verified: true,
    minLevel: manager,
  },
  {
    key: "editor",
    label: "Biên Tập",
    labelEn: "Editor",
    icon: PenLine,
    group: "contribution",
    color: "text-sky-500 bg-sky-500/10",
    border: "border-sky-500/30",
    description: "Viết và biên tập bài tin tức.",
    minLevel: manager,
  },
  {
    key: "moderator",
    label: "Kiểm Duyệt",
    labelEn: "Moderator",
    icon: ShieldAlert,
    group: "contribution",
    color: "text-emerald-500 bg-emerald-500/10",
    border: "border-emerald-500/30",
    description: "Kiểm duyệt bình luận và bài đăng cộng đồng.",
    minLevel: admin,
  },
  {
    key: "contributor",
    label: "Cộng Tác Viên",
    labelEn: "Contributor",
    icon: HeartHandshake,
    group: "contribution",
    color: "text-teal-500 bg-teal-500/10",
    border: "border-teal-500/30",
    description: "Đóng góp nội dung, dữ liệu wiki, hình ảnh.",
    minLevel: support,
  },
  {
    key: "tester",
    label: "Thử Nghiệm",
    labelEn: "Tester",
    icon: Bug,
    group: "contribution",
    color: "text-lime-500 bg-lime-500/10",
    border: "border-lime-500/30",
    description: "Tham gia thử nghiệm tính năng mới, báo lỗi.",
    minLevel: support,
  },

  // ── Đối tác ──
  {
    key: "partner",
    label: "Đối Tác",
    labelEn: "Partner",
    icon: Handshake,
    group: "partner",
    color: "text-indigo-500 bg-indigo-500/10",
    border: "border-indigo-500/30",
    description: "Đối tác chính thức của Arex.",
    verified: true,
    minLevel: admin,
  },
  {
    key: "sponsor",
    label: "Nhà Tài Trợ",
    labelEn: "Sponsor",
    icon: Gem,
    group: "partner",
    color: "text-amber-500 bg-amber-500/10",
    border: "border-amber-500/30",
    description: "Tài trợ giải đấu hoặc hoạt động cộng đồng.",
    verified: true,
    minLevel: admin,
  },
  {
    key: "streamer",
    label: "Streamer",
    labelEn: "Streamer",
    icon: Video,
    group: "partner",
    color: "text-rose-500 bg-rose-500/10",
    border: "border-rose-500/30",
    description: "Streamer hợp tác phát nội dung Free Fire.",
    verified: true,
    minLevel: manager,
  },
  {
    key: "caster",
    label: "Bình Luận Viên",
    labelEn: "Caster",
    icon: Mic,
    group: "partner",
    color: "text-orange-500 bg-orange-500/10",
    border: "border-orange-500/30",
    description: "Bình luận viên giải đấu Arex.",
    minLevel: manager,
  },

  // ── Cộng đồng ──
  {
    key: "founder",
    label: "Sáng Lập",
    labelEn: "Founder",
    icon: Crown,
    group: "community",
    color: "text-red-500 bg-red-500/10",
    border: "border-red-500/30",
    description: "Thành viên sáng lập Arex.",
    verified: true,
    minLevel: super_admin,
  },
  {
    key: "veteran",
    label: "Kỳ Cựu",
    labelEn: "Veteran",
    icon: Medal,
    group: "community",
    color: "text-stone-500 bg-stone-500/10",
    border: "border-stone-500/30",
    description: "Gắn bó với cộng đồng từ những ngày đầu.",
    minLevel: manager,
  },
  {
    key: "vip",
    label: "VIP",
    labelEn: "VIP",
    icon: Flame,
    group: "community",
    color: "text-yellow-500 bg-yellow-500/10",
    border: "border-yellow-500/30",
    description: "Thành viên VIP của cộng đồng.",
    minLevel: manager,
  },
  {
    key: "early_bird",
    label: "Tiên Phong",
    labelEn: "Early Bird",
    icon: Rocket,
    group: "community",
    color: "text-cyan-500 bg-cyan-500/10",
    border: "border-cyan-500/30",
    description: "Đăng ký trong giai đoạn ra mắt.",
    minLevel: support,
  },

  // ── Thành tích ──
  {
    key: "champion",
    label: "Nhà Vô Địch",
    labelEn: "Champion",
    icon: Trophy,
    group: "achievement",
    color: "text-amber-400 bg-amber-400/10",
    border: "border-amber-400/30",
    description: "Vô địch một giải đấu do Arex tổ chức.",
    minLevel: manager,
  },
  {
    key: "pro_player",
    label: "Tuyển Thủ",
    labelEn: "Pro Player",
    icon: Swords,
    group: "achievement",
    color: "text-violet-500 bg-violet-500/10",
    border: "border-violet-500/30",
    description: "Tuyển thủ chuyên nghiệp đã xác thực.",
    verified: true,
    minLevel: manager,
  },
  {
    key: "top_contributor",
    label: "Đóng Góp Nổi Bật",
    labelEn: "Top Contributor",
    icon: Award,
    group: "achievement",
    color: "text-pink-500 bg-pink-500/10",
    border: "border-pink-500/30",
    description: "Đóng góp nổi bật trong tháng / quý.",
    minLevel: support,
  },
];

export const USER_BADGE_MAP: Record<string, UserBadgeMeta> = Object.fromEntries(
  USER_BADGES.map((b) => [b.key, b]),
);

/** Thứ tự hiển thị: theo vị trí trong USER_BADGES (đã sắp theo nhóm). */
const BADGE_ORDER: Record<string, number> = Object.fromEntries(
  USER_BADGES.map((b, i) => [b.key, i]),
);

export const MAX_USER_BADGES = 8;

export function getBadgeMeta(key: string | null | undefined): UserBadgeMeta | null {
  if (!key) return null;
  return USER_BADGE_MAP[key] ?? null;
}

/**
 * Lọc bỏ key rác/trùng, sắp xếp theo thứ tự danh mục, cắt còn MAX_USER_BADGES.
 * Dùng ở cả API (trước khi ghi DB) lẫn UI (khi đọc ra).
 */
export function normalizeBadges(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item.trim().toLowerCase();
    if (USER_BADGE_MAP[key]) seen.add(key);
  }
  return [...seen]
    .sort((a, b) => (BADGE_ORDER[a] ?? 999) - (BADGE_ORDER[b] ?? 999))
    .slice(0, MAX_USER_BADGES);
}

export function getBadgeMetas(badges: string[] | null | undefined): UserBadgeMeta[] {
  return normalizeBadges(badges).map((key) => USER_BADGE_MAP[key]);
}

/** Có nhãn nào tự động kéo theo tích xanh không. */
export function badgesGrantVerified(badges: string[] | null | undefined): boolean {
  return getBadgeMetas(badges).some((b) => b.verified);
}

/** Nhãn mà một người ở cấp `callerLevel` được phép gán / thu hồi. */
export function assignableBadges(callerLevel: number): UserBadgeMeta[] {
  return USER_BADGES.filter((b) => callerLevel >= b.minLevel);
}

export function canAssignBadge(callerLevel: number, key: string): boolean {
  const meta = USER_BADGE_MAP[key];
  return Boolean(meta) && callerLevel >= meta.minLevel;
}
