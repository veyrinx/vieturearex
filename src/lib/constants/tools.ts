import {
  Crosshair,
  ListOrdered,
  Layers,
  Image as ImageIcon,
  Sparkles,
  CalendarClock,
  Activity,
  Skull,
  Gem,
  Brain,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ToolBadge = "MỚI" | "HOT";

export type Tool = {
  href: string;
  /** Tên đầy đủ — dùng ở trang /cong-cu */
  title: string;
  /** Mô tả dài — dùng ở trang /cong-cu */
  desc: string;
  icon: LucideIcon;
  /** Màu tile ở /cong-cu, dạng "text-x bg-x/10" */
  accent: string;
  /** Gradient cho carousel trang chủ, dạng "from-x to-y" */
  gradient: string;
  /** Xuất hiện trên carousel trang chủ */
  featured?: boolean;
  /** Mô tả ngắn cho carousel (mặc định fallback về desc) */
  shortDesc?: string;
  /** Nhãn nổi bật trên carousel */
  badge?: ToolBadge;
};

/**
 * Nguồn dữ liệu công cụ duy nhất cho cả trang chủ (carousel) lẫn /cong-cu.
 * Sửa ở đây, cả hai nơi cùng cập nhật.
 */
export const TOOLS: Tool[] = [
  {
    href: "/do-nhay",
    title: "Chỉnh Độ Nhạy",
    desc: "Gợi ý thông số độ nhạy theo cấu hình máy & lối chơi, tự nhận diện thiết bị.",
    icon: Crosshair,
    accent: "text-sky-500 bg-sky-500/10",
    gradient: "from-sky-500 to-blue-500",
    featured: true,
    shortDesc: "Cấu hình sensitivity chuẩn theo máy của bạn.",
    badge: "HOT",
  },
  {
    href: "/tier-list",
    title: "Tier List Nhân Vật",
    desc: "Xếp hạng nhân vật S/A/B/C/D theo meta cộng đồng, lọc theo vai trò.",
    icon: ListOrdered,
    accent: "text-amber-500 bg-amber-500/10",
    gradient: "from-amber-500 to-orange-500",
    featured: true,
    shortDesc: "Xếp hạng sức mạnh nhân vật theo meta.",
  },
  {
    href: "/combo",
    title: "Tạo Combo Kỹ Năng",
    desc: "Ghép 1 kỹ năng chủ động + 3 bị động thành combo tối ưu cho lối chơi.",
    icon: Layers,
    accent: "text-violet-500 bg-violet-500/10",
    gradient: "from-violet-500 to-purple-500",
    featured: true,
    shortDesc: "Ghép bộ kỹ năng tối ưu cho lối chơi.",
  },
  {
    href: "/items",
    title: "Thư Viện Icon",
    desc: "Tra cứu hơn 33.000 icon Free Fire (vũ khí, nhân vật, skin...), copy & tải.",
    icon: ImageIcon,
    accent: "text-emerald-500 bg-emerald-500/10",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    href: "/tao-ten",
    title: "Tạo Tên Kí Tự",
    desc: "Tạo nickname kí tự đặc biệt + khung trang trí phong cách, bấm copy vào game.",
    icon: Sparkles,
    accent: "text-pink-500 bg-pink-500/10",
    gradient: "from-fuchsia-500 to-pink-500",
    featured: true,
    shortDesc: "Nickname kí tự đặc biệt + khung trang trí.",
  },
  {
    href: "/dem-nguoc",
    title: "Đếm Ngược Sự Kiện",
    desc: "Đồng hồ đếm ngược tới bản cập nhật OB, reset rank và sự kiện sắp diễn ra.",
    icon: CalendarClock,
    accent: "text-cyan-500 bg-cyan-500/10",
    gradient: "from-cyan-500 to-teal-500",
    featured: true,
    shortDesc: "Đồng hồ đếm ngược tới bản cập nhật OB.",
  },
  {
    href: "/trang-thai",
    title: "Trạng Thái Máy Chủ",
    desc: "Free Fire có đang bảo trì / sự cố không + lịch bảo trì sắp tới.",
    icon: Activity,
    accent: "text-rose-500 bg-rose-500/10",
    gradient: "from-rose-500 to-red-500",
  },
  {
    href: "/tinh-kd",
    title: "Máy Tính K/D",
    desc: "Tính K/D, tỉ lệ thắng, hạ gục trung bình mỗi trận từ chỉ số của bạn.",
    icon: Skull,
    accent: "text-red-500 bg-red-500/10",
    gradient: "from-red-500 to-rose-600",
    featured: true,
    shortDesc: "Tính K/D, tỉ lệ thắng & hạ gục mỗi trận.",
  },
  {
    href: "/dinh-gia-nick",
    title: "Ước Tính Nick",
    desc: "Tính điểm độ khủng tài khoản từ rank, level, skin & đồ hiếm (cho vui).",
    icon: Gem,
    accent: "text-fuchsia-500 bg-fuchsia-500/10",
    gradient: "from-fuchsia-500 to-purple-500",
  },
  {
    href: "/quiz",
    title: "Quiz Free Fire",
    desc: "Trắc nghiệm kiến thức FF: nhân vật, vũ khí, chế độ chơi, rank & meta.",
    icon: Brain,
    accent: "text-pink-500 bg-pink-500/10",
    gradient: "from-pink-500 to-rose-500",
    featured: true,
    shortDesc: "Trắc nghiệm kiến thức FF, đọ điểm cộng đồng.",
    badge: "MỚI",
  },
  {
    href: "/tinh-nap",
    title: "Máy Tính Nạp",
    desc: "Tính kim cương & tiền cần cho vật phẩm hoặc vòng quay — chi tiêu hợp lý.",
    icon: Wallet,
    accent: "text-teal-500 bg-teal-500/10",
    gradient: "from-teal-500 to-emerald-500",
  },
];

/** Các công cụ được chọn hiển thị trên carousel trang chủ. */
export const FEATURED_TOOLS = TOOLS.filter((t) => t.featured);
