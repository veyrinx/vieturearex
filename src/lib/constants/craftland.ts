import type {
  CraftlandMapStatus,
  CraftlandReportReason,
  CraftlandVerificationStatus,
} from "@/lib/types/craftland";

export const CRAFTLAND_BASE = "/community/craftland";
export const CRAFTLAND_MAPS = `${CRAFTLAND_BASE}/maps`;
export const CRAFTLAND_ACADEMY = `${CRAFTLAND_BASE}/academy`;
export const CRAFTLAND_STUDIO = "/creator";

export const craftlandMapHref = (slug: string) => `${CRAFTLAND_MAPS}/${slug}`;
export const craftlandCreatorHref = (username: string) => `${CRAFTLAND_BASE}/creators/${username}`;
export const craftlandAcademyHref = (slug: string) => `${CRAFTLAND_ACADEMY}/${slug}`;

export const MAP_PAGE_SIZE = 24;

export const MAP_SORTS = [
  { key: "newest",   label: "Mới nhất" },
  { key: "trending", label: "Được quan tâm" },
  { key: "popular",  label: "Nhiều lượt xem" },
  { key: "saved",    label: "Nhiều lượt lưu" },
  { key: "rating",   label: "Đánh giá cao" },
  { key: "featured", label: "Nổi bật" },
  { key: "editor",   label: "Biên tập viên đề xuất" },
] as const;
export type MapSortKey = (typeof MAP_SORTS)[number]["key"];

export const MAP_PERIODS = [
  { key: "all", label: "Mọi lúc", days: 0 },
  { key: "7d",  label: "7 ngày",  days: 7 },
  { key: "30d", label: "30 ngày", days: 30 },
  { key: "90d", label: "90 ngày", days: 90 },
] as const;
export type MapPeriodKey = (typeof MAP_PERIODS)[number]["key"];

export const MAP_STATUS_META: Record<CraftlandMapStatus, { label: string; tone: string; hint: string }> = {
  draft:     { label: "Bản nháp",   tone: "bg-muted text-muted-foreground",                         hint: "Chỉ bạn nhìn thấy. Gửi duyệt khi đã sẵn sàng." },
  pending:   { label: "Chờ duyệt",  tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300",     hint: "Đội kiểm duyệt đang xem xét. Bản đồ chưa hiển thị công khai." },
  published: { label: "Đã xuất bản", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", hint: "Đang hiển thị trong thư viện." },
  rejected:  { label: "Bị từ chối", tone: "bg-red-500/12 text-red-700 dark:text-red-300",           hint: "Xem phản hồi kiểm duyệt, chỉnh sửa rồi gửi lại." },
  hidden:    { label: "Đã ẩn",      tone: "bg-orange-500/12 text-orange-700 dark:text-orange-300",  hint: "Kiểm duyệt viên tạm ẩn bản đồ khỏi thư viện." },
  archived:  { label: "Lưu trữ",    tone: "bg-slate-500/12 text-slate-700 dark:text-slate-300",     hint: "Bạn đã lưu trữ bản đồ. Khôi phục để chỉnh sửa tiếp." },
  removed:   { label: "Đã gỡ",      tone: "bg-red-500/12 text-red-700 dark:text-red-300",           hint: "Bản đồ bị gỡ do vi phạm. Liên hệ hỗ trợ nếu cần khiếu nại." },
};

export const VERIFICATION_META: Record<CraftlandVerificationStatus, { label: string; tone: string }> = {
  none:     { label: "Chưa xác minh",            tone: "bg-muted text-muted-foreground" },
  pending:  { label: "Đang chờ xét duyệt",       tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  verified: { label: "Đã xác minh bởi ArexNetwork", tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  rejected: { label: "Bị từ chối",               tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
  revoked:  { label: "Đã thu hồi xác minh",      tone: "bg-slate-500/12 text-slate-700 dark:text-slate-300" },
};

/**
 * Câu giải thích huy hiệu — hiển thị ở tooltip và trang hồ sơ. ArexNetwork
 * không có uỷ quyền của Garena, nên phải nói rõ đây là huy hiệu của Arex.
 */
export const VERIFIED_BADGE_DISCLAIMER =
  "Huy hiệu do ArexNetwork cấp sau khi kiểm tra hồ sơ creator. Đây không phải xác nhận chính thức của Garena hay Free Fire.";

export const REPORT_REASONS: { key: CraftlandReportReason; label: string }[] = [
  { key: "wrong_info",    label: "Thông tin sai" },
  { key: "wrong_code",    label: "Mã map sai / không vào được" },
  { key: "duplicate",     label: "Trùng với bản đồ khác" },
  { key: "stolen",        label: "Đăng lại bản đồ của người khác" },
  { key: "inappropriate", label: "Nội dung không phù hợp" },
  { key: "other",         label: "Lý do khác" },
];

export const PLATFORM_LABELS = { mobile: "Mobile", pc: "PC" } as const;

/** Giải thích chỉ số — hiện ngay trong Creator Studio và trang admin. */
export const METRIC_EXPLAINERS = {
  views:
    "Lượt mở trang chi tiết bản đồ trên website ArexNetwork. Cùng một khách chỉ được tính 1 lượt trong mỗi khung 30 phút; bot, trình thu thập và lượt xem của chính bạn không được tính. Đây KHÔNG phải số lượt chơi trong game Free Fire.",
  unique:
    "Ước tính số khách khác nhau mỗi ngày, dựa trên mã băm ẩn danh (IP + trình duyệt + muối đổi mỗi ngày). Không lưu IP và không định danh được cá nhân.",
  copies: "Số lần bấm nút sao chép mã map (chống trùng 30 phút cho mỗi khách).",
  shares: "Số lần bấm chia sẻ bản đồ (chống trùng 30 phút cho mỗi khách).",
  guide: "Số lần mở phần hướng dẫn trải nghiệm bản đồ.",
  conversion: "Tỷ lệ = (lượt sao chép mã + lượt mở hướng dẫn) / lượt xem trong cùng khoảng thời gian.",
  favorites: "Số tài khoản đang lưu bản đồ vào danh sách yêu thích.",
  rating: "Điểm trung bình từ thành viên đã đăng nhập (1–5 sao). Bạn không thể tự đánh giá bản đồ của mình.",
} as const;

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Truy cập trực tiếp",
  search: "Tìm kiếm nội bộ",
  library: "Thư viện bản đồ",
  home: "Trang Craftland",
  creator: "Trang creator",
  related: "Bản đồ liên quan",
  share: "Liên kết chia sẻ",
  external: "Trang web khác",
};
