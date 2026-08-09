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
  Search,
  Swords,
  Trophy,
  Users,
  Phone,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export type ToolBadge = "MỚI" | "HOT" | "BẢO TRÌ";

export type ToolCategory = "tra-cuu" | "tinh-toan" | "meta" | "tien-ich";

/** Nhóm công cụ — dùng cho bộ lọc ở /tools. Thứ tự ở đây là thứ tự hiển thị. */
export const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string }> = [
  { id: "tra-cuu", label: "Tra cứu" },
  { id: "tinh-toan", label: "Tính toán" },
  { id: "meta", label: "Meta & lối chơi" },
  { id: "tien-ich", label: "Tiện ích" },
];

export type Tool = {
  href: string;
  /** Nhóm để lọc ở /tools */
  category: ToolCategory;
  /** Từ khoá phụ cho ô tìm kiếm — người dùng gõ "sensitivity" vẫn ra "Chỉnh Độ Nhạy" */
  keywords?: string[];
  /** Tên đầy đủ — dùng ở trang /tools */
  title: string;
  /** Mô tả dài — dùng ở trang /tools */
  desc: string;
  icon: LucideIcon;
  /** Màu tile ở /tools, dạng "text-x bg-x/10" */
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
 * Nguồn dữ liệu công cụ duy nhất cho cả trang chủ (carousel) lẫn /tools.
 * Sửa ở đây, cả hai nơi cùng cập nhật.
 */
export const TOOLS: Tool[] = [
  {
    href: "/check-scam",
    category: "tra-cuu",
    keywords: ["check scam", "lừa đảo", "tố cáo", "kiểm tra stk", "sđt lừa đảo", "checkscam"],
    title: "Check Scam — Kiểm Tra Lừa Đảo",
    desc: "Tính năng đang trong quá trình nâng cấp và bảo trì hệ thống. Vui lòng quay lại sau!",
    icon: ShieldAlert,
    accent: "text-rose-500 bg-rose-500/10",
    gradient: "from-rose-600 to-pink-600",
    featured: true,
    shortDesc: "[BẢO TRÌ] Tra cứu tố cáo scam, STK & SĐT lừa đảo.",
    badge: "BẢO TRÌ",
  },
  {
    href: "/phone-lookup",
    category: "tra-cuu",
    keywords: ["phone", "sđt", "điện thoại", "tra cứu số", "phone lookup", "quốc tế"],
    title: "Phone Lookup VietNam",
    desc: "Tra cứu số điện thoại Việt Nam (đầu 84): nhà mạng, định dạng quốc tế, loại số, UID & dữ liệu RAW.",
    icon: Phone,
    accent: "text-cyan-500 bg-cyan-500/10",
    gradient: "from-cyan-500 to-teal-500",
    featured: true,
    shortDesc: "Tra cứu SĐT Việt Nam (đầu 84) + dữ liệu RAW.",
    badge: "MỚI",
  },
  {
    href: "/player-lookup",
    category: "tra-cuu",
    keywords: ["uid", "acc", "tài khoản", "check nick", "thông tin nick"],
    title: "Tra Cứu Nick",
    desc: "Nhập UID để xem tên, cấp độ, rank BR/CS, lượt thích, guild, pet của tài khoản Free Fire.",
    icon: Search,
    accent: "text-indigo-500 bg-indigo-500/10",
    gradient: "from-indigo-500 to-blue-500",
    featured: true,
    shortDesc: "Nhập UID → xem thông tin tài khoản FF.",
    badge: "MỚI",
  },
  {
    href: "/player-compare",
    category: "tra-cuu",
    keywords: ["uid", "so kè", "đối đầu", "compare"],
    title: "So Sánh Nick",
    desc: "Nhập 2 UID để so kè cấp độ, lượt thích, rank, EXP, pet — xem nick nào trâu hơn.",
    icon: Swords,
    accent: "text-rose-500 bg-rose-500/10",
    gradient: "from-rose-500 to-red-500",
    featured: true,
    shortDesc: "So kè 2 nick FF xem ai trâu hơn.",
    badge: "MỚI",
  },
  {
    href: "/guild-lookup",
    category: "tra-cuu",
    keywords: ["bang hội", "clan", "hội", "uid"],
    title: "Tra Cứu Guild",
    desc: "Nhập UID thành viên để xem chi tiết guild Free Fire: tên, cấp độ, sĩ số, sức chứa và chủ guild.",
    icon: Users,
    accent: "text-teal-500 bg-teal-500/10",
    gradient: "from-teal-500 to-cyan-500",
    shortDesc: "Nhập UID → xem chi tiết guild FF.",
    badge: "MỚI",
  },
  {
    href: "/sensitivity",
    category: "tinh-toan",
    keywords: ["sensitivity", "dpi", "kéo tâm", "setting", "cài đặt"],
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
    category: "meta",
    keywords: ["xếp hạng", "nhân vật", "character", "mạnh nhất"],
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
    category: "meta",
    keywords: ["kỹ năng", "skill", "build", "nhân vật"],
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
    category: "tra-cuu",
    keywords: ["icon", "ảnh", "skin", "vũ khí", "item", "hình"],
    title: "Thư Viện Icon",
    desc: "Tra cứu hơn 33.000 icon Free Fire (vũ khí, nhân vật, skin...), copy & tải.",
    icon: ImageIcon,
    accent: "text-emerald-500 bg-emerald-500/10",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    href: "/name-generator",
    category: "tien-ich",
    keywords: ["nickname", "tên đẹp", "kí tự đặc biệt", "font", "name"],
    title: "Tạo Tên Kí Tự",
    desc: "Tạo nickname kí tự đặc biệt + khung trang trí phong cách, bấm copy vào game.",
    icon: Sparkles,
    accent: "text-pink-500 bg-pink-500/10",
    gradient: "from-fuchsia-500 to-pink-500",
    featured: true,
    shortDesc: "Nickname kí tự đặc biệt + khung trang trí.",
  },
  {
    href: "/countdown",
    category: "tien-ich",
    keywords: ["countdown", "ob", "cập nhật", "reset rank", "lịch"],
    title: "Đếm Ngược Sự Kiện",
    desc: "Đồng hồ đếm ngược tới bản cập nhật OB, reset rank và sự kiện sắp diễn ra.",
    icon: CalendarClock,
    accent: "text-cyan-500 bg-cyan-500/10",
    gradient: "from-cyan-500 to-teal-500",
    featured: true,
    shortDesc: "Đồng hồ đếm ngược tới bản cập nhật OB.",
  },
  {
    href: "/server-status",
    category: "tra-cuu",
    keywords: ["server", "bảo trì", "sập", "lỗi", "status"],
    title: "Trạng Thái Máy Chủ",
    desc: "Free Fire có đang bảo trì / sự cố không + lịch bảo trì sắp tới.",
    icon: Activity,
    accent: "text-rose-500 bg-rose-500/10",
    gradient: "from-rose-500 to-red-500",
  },
  {
    href: "/kd-calculator",
    category: "tinh-toan",
    keywords: ["kd", "tỉ lệ", "thắng", "kill death", "chỉ số"],
    title: "Máy Tính K/D",
    desc: "Tính K/D, tỉ lệ thắng, hạ gục trung bình mỗi trận từ chỉ số của bạn.",
    icon: Skull,
    accent: "text-red-500 bg-red-500/10",
    gradient: "from-red-500 to-rose-600",
    featured: true,
    shortDesc: "Tính K/D, tỉ lệ thắng & hạ gục mỗi trận.",
  },
  {
    href: "/top-players-vn",
    category: "tra-cuu",
    keywords: ["bảng xếp hạng", "top", "leaderboard", "nick khủng"],
    title: "BXH Nick Khủng VN",
    desc: "Top nick Free Fire khủng nhất khu vực VN — tự chấm điểm từ dữ liệu thật (level, likes, EXP, rank) mỗi khi có người tra cứu.",
    icon: Trophy,
    accent: "text-amber-500 bg-amber-500/10",
    gradient: "from-amber-500 to-orange-500",
    featured: true,
    shortDesc: "Top nick FF khủng nhất VN, tự cập nhật.",
    badge: "MỚI",
  },
  {
    href: "/account-value",
    category: "tinh-toan",
    keywords: ["định giá", "giá nick", "độ khủng", "chấm điểm"],
    title: "Ước Tính Nick",
    desc: "Tính điểm độ khủng tài khoản từ rank, level, skin & đồ hiếm (cho vui).",
    icon: Gem,
    accent: "text-fuchsia-500 bg-fuchsia-500/10",
    gradient: "from-fuchsia-500 to-purple-500",
  },
  {
    href: "/quiz",
    category: "tien-ich",
    keywords: ["trắc nghiệm", "đố vui", "kiến thức", "test"],
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
    href: "/topup-calculator",
    category: "tinh-toan",
    keywords: ["kim cương", "nạp", "tiền", "giá", "vòng quay"],
    title: "Máy Tính Nạp",
    desc: "Tính kim cương & tiền cần cho vật phẩm hoặc vòng quay — chi tiêu hợp lý.",
    icon: Wallet,
    accent: "text-teal-500 bg-teal-500/10",
    gradient: "from-teal-500 to-emerald-500",
  },
];

/** Các công cụ được chọn hiển thị trên carousel trang chủ. */
export const FEATURED_TOOLS = TOOLS.filter((t) => t.featured);
