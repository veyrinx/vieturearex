import type { ArrayResourceConfig, RowResourceConfig } from "@/admin/config";

/**
 * Khai báo cụ thể từng mục quản trị dạng danh sách.
 *
 * Trường nào không khai ở đây thì màn hình chung không đụng tới — khi sửa, giá
 * trị cũ của mục được gửi lại nguyên vẹn (xem components/resource-screen.tsx),
 * nên bỏ bớt trường phụ không làm mất dữ liệu.
 */

// ── Danh sách nằm gọn trong một dòng cài đặt JSON ────────────────────────────

export const PARTNERS: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/partners",
  listKey: "items",
  itemLabel: "đối tác",
  titleField: "name",
  subtitleField: "desc",
  enabledField: "enabled",
  reorder: true,
  blank: { id: "", name: "", tier: "community", enabled: true },
  fields: [
    { name: "name", label: "Tên đối tác", required: true },
    {
      name: "tier",
      label: "Hạng",
      type: "select",
      options: [
        { value: "sponsor", label: "Nhà tài trợ" },
        { value: "media", label: "Đối tác truyền thông" },
        { value: "community", label: "Cộng đồng đồng hành" },
      ],
    },
    { name: "desc", label: "Mô tả", type: "textarea", rows: 3 },
    { name: "logo", label: "Logo", type: "image", bucket: "logos" },
    { name: "logoRight", label: "Logo cho nền sáng", type: "image", bucket: "logos" },
    { name: "url", label: "Website", type: "url", placeholder: "https://" },
    { name: "endsAt", label: "Hợp tác đến ngày", type: "date" },
    { name: "featured", label: "Ghim nổi bật", type: "switch" },
    { name: "enabled", label: "Hiển thị trên web", type: "switch" },
  ],
};

export const PROJECTS: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/projects",
  listKey: "projects",
  itemLabel: "dự án",
  titleField: "name",
  subtitleField: "description",
  reorder: true,
  blank: { id: "", name: "", priority: "normal" },
  fields: [
    { name: "name", label: "Tên dự án", required: true },
    { name: "description", label: "Mô tả", type: "textarea", rows: 3 },
    {
      name: "path",
      label: "Đường dẫn trên web",
      placeholder: "/vu-khi",
      hint: "Có đường dẫn thì tiến độ tự suy ra từ trạng thái route.",
    },
    { name: "category", label: "Nhóm" },
    { name: "targetDate", label: "Hạn dự kiến", placeholder: "Quý 3/2026" },
    {
      name: "priority",
      label: "Mức ưu tiên",
      type: "select",
      options: [
        { value: "low", label: "Thấp" },
        { value: "normal", label: "Bình thường" },
        { value: "high", label: "Cao" },
      ],
    },
    {
      name: "manualProgress",
      label: "Tiến độ tự đặt (%)",
      type: "number",
      hint: "Bỏ trống để tính tự động.",
    },
  ],
};

export const PRIME: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/prime",
  listKey: "items",
  itemLabel: "gói Prime",
  titleField: "name",
  subtitleField: "duration",
  enabledField: "enabled",
  reorder: true,
  blank: { id: "", name: "", type: "pack", price: 0, enabled: true },
  fields: [
    { name: "name", label: "Tên gói", required: true },
    {
      name: "type",
      label: "Loại",
      type: "select",
      options: [
        { value: "membership", label: "Gói hội viên" },
        { value: "pack", label: "Gói vật phẩm" },
      ],
    },
    { name: "price", label: "Giá (kim cương)", type: "number" },
    { name: "duration", label: "Thời hạn", placeholder: "30 ngày" },
    { name: "image", label: "Ảnh", type: "image", bucket: "logos" },
    {
      name: "rarity",
      label: "Độ hiếm",
      type: "select",
      options: [
        { value: "", label: "— Không đặt —" },
        { value: "COMMON", label: "Phổ thông" },
        { value: "UNCOMMON", label: "Ít gặp" },
        { value: "RARE", label: "Hiếm" },
        { value: "EPIC", label: "Sử thi" },
      ],
    },
    { name: "perks", label: "Quyền lợi", type: "tags", hint: "Mỗi dòng một quyền lợi." },
    { name: "featured", label: "Nổi bật", type: "switch" },
    { name: "enabled", label: "Đang bán", type: "switch" },
  ],
};

export const SOCIAL: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/social",
  listKey: "items",
  itemLabel: "video",
  titleField: "title",
  subtitleField: "url",
  enabledField: "enabled",
  reorder: true,
  blank: { id: "", title: "", url: "", platform: "tiktok", enabled: true },
  fields: [
    { name: "title", label: "Tiêu đề", required: true },
    { name: "url", label: "Đường dẫn video", type: "url", required: true },
    {
      name: "platform",
      label: "Nền tảng",
      type: "select",
      options: [
        { value: "tiktok", label: "TikTok" },
        { value: "youtube", label: "YouTube" },
      ],
    },
    { name: "thumbnail", label: "Ảnh đại diện", type: "image", bucket: "logos" },
    { name: "enabled", label: "Hiển thị", type: "switch" },
  ],
};

export const PAGE_CONTENT: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/page-content",
  listKey: "items",
  itemLabel: "trang",
  titleField: "key",
  enabledField: "enabled",
  reorder: false,
  blank: { key: "about", body: "", enabled: true },
  emptyHint: "Chưa trang nào bị ghi đè — web đang dùng nội dung dựng sẵn.",
  fields: [
    {
      name: "key",
      label: "Trang",
      type: "select",
      required: true,
      options: [
        { value: "about", label: "Về chúng tôi" },
        { value: "nap-an-toan", label: "Nạp an toàn" },
        { value: "dang-ky-tin", label: "Đăng ký nhận tin" },
        { value: "hop-tac", label: "Hợp tác & Đối tác" },
        { value: "privacy-policy", label: "Chính sách bảo mật" },
        { value: "terms-of-use", label: "Điều khoản sử dụng" },
        { value: "cookie-policy", label: "Chính sách cookie" },
      ],
    },
    { name: "body", label: "Nội dung (HTML)", type: "textarea", rows: 14, required: true },
    { name: "enabled", label: "Dùng bản này", type: "switch" },
  ],
};

export const COUNTDOWNS: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/countdowns",
  listKey: "items",
  itemLabel: "mốc đếm ngược",
  titleField: "label",
  subtitleField: "note",
  enabledField: "enabled",
  reorder: true,
  blank: { id: "", label: "", date: "", enabled: true },
  fields: [
    { name: "label", label: "Tên mốc", required: true },
    { name: "date", label: "Thời điểm", type: "datetime", required: true },
    { name: "note", label: "Ghi chú", type: "textarea", rows: 2 },
    { name: "tag", label: "Nhãn", placeholder: "Rank / Update" },
    { name: "enabled", label: "Hiển thị", type: "switch" },
  ],
};

export const FEATURE_LOCKS: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/feature-locks",
  listKey: "locks",
  itemLabel: "khoá",
  titleField: "path",
  subtitleField: "title",
  reorder: false,
  blank: { path: "/", status: "maintenance" },
  emptyHint: "Không khoá chức năng nào — toàn bộ web đang mở.",
  fields: [
    {
      name: "path",
      label: "Đường dẫn",
      required: true,
      placeholder: "/cho",
      hint: "Khoá luôn cả route con bên trong.",
    },
    {
      name: "status",
      label: "Kiểu khoá",
      type: "select",
      options: [
        { value: "maintenance", label: "Đang bảo trì" },
        { value: "locked", label: "Tạm khoá" },
        { value: "coming-soon", label: "Sắp ra mắt" },
      ],
    },
    { name: "title", label: "Tiêu đề hiện cho người dùng" },
    { name: "message", label: "Lời nhắn", type: "textarea", rows: 3 },
    { name: "until", label: "Dự kiến mở lại", placeholder: "20/07/2026" },
  ],
};

export const QUIZ: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/quiz",
  listKey: "questions",
  itemLabel: "câu hỏi",
  titleField: "q",
  reorder: true,
  blank: { q: "", opts: ["", ""], ans: 0 },
  fields: [
    { name: "q", label: "Câu hỏi", type: "textarea", rows: 2, required: true },
    { name: "opts", label: "Đáp án", type: "tags", hint: "Mỗi dòng một đáp án (2–6 dòng)." },
    { name: "ans", label: "Đáp án đúng", type: "number", hint: "Số thứ tự dòng, tính từ 0." },
  ],
};

export const ACHIEVEMENT_DEFS: ArrayResourceConfig = {
  kind: "array",
  endpoint: "/api/admin/achievements/defs",
  listKey: "items",
  itemLabel: "huy hiệu",
  titleField: "name",
  subtitleField: "description",
  reorder: true,
  blank: {
    id: "",
    name: "",
    description: "",
    icon: "🏅",
    rarity: "common",
    category: "account",
    points: 10,
  },
  fields: [
    { name: "id", label: "Mã huy hiệu", required: true, hint: "Chữ thường, số và gạch dưới." },
    { name: "name", label: "Tên", required: true },
    { name: "description", label: "Mô tả", type: "textarea", rows: 2 },
    { name: "icon", label: "Biểu tượng (emoji)" },
    {
      name: "rarity",
      label: "Độ hiếm",
      type: "select",
      options: [
        { value: "common", label: "Phổ thông" },
        { value: "uncommon", label: "Ít gặp" },
        { value: "rare", label: "Hiếm" },
        { value: "epic", label: "Sử thi" },
        { value: "legendary", label: "Huyền thoại" },
      ],
    },
    {
      name: "category",
      label: "Nhóm",
      type: "select",
      options: [
        { value: "account", label: "Tài khoản" },
        { value: "content", label: "Nội dung" },
        { value: "forum", label: "Diễn đàn" },
        { value: "wiki", label: "Wiki" },
        { value: "tournament", label: "Giải đấu" },
        { value: "rank", label: "Xếp hạng" },
        { value: "social", label: "Cộng đồng" },
        { value: "loyalty", label: "Gắn bó" },
      ],
    },
    { name: "points", label: "Điểm", type: "number" },
    { name: "hidden", label: "Ẩn cho tới khi đạt", type: "switch" },
  ],
};

// ── Mỗi mục là một dòng trong bảng ──────────────────────────────────────────

export const STREAMS: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/streams",
  listKey: "streams",
  itemLabel: "buổi phát",
  titleField: "title",
  subtitleField: "scheduled_at",
  updateMethod: "PATCH",
  fields: [
    { name: "title", label: "Tiêu đề", required: true },
    { name: "youtube_url", label: "Link YouTube", type: "url", required: true },
    { name: "thumbnail_url", label: "Ảnh bìa", type: "image", bucket: "events" },
    { name: "scheduled_at", label: "Thời gian phát", type: "datetime", required: true },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { value: "upcoming", label: "Sắp phát" },
        { value: "live", label: "Đang phát" },
        { value: "ended", label: "Đã kết thúc" },
      ],
    },
    { name: "category", label: "Danh mục", placeholder: "ESPORTS" },
  ],
};

export const FRAMES: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/cosmetics",
  listKey: "frames",
  itemLabel: "khung avatar",
  titleField: "name",
  subtitleField: "rarity",
  updateMethod: "PUT",
  idInQuery: true,
  params: { type: "frame" },
  extra: { type: "frame" },
  fields: [
    { name: "name", label: "Tên khung", required: true },
    { name: "image_url", label: "Ảnh khung", type: "image", bucket: "logos" },
    { name: "rarity", label: "Độ hiếm" },
    { name: "price", label: "Giá", type: "number" },
  ],
};

export const COSMETIC_TITLES: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/cosmetics",
  listKey: "titles",
  itemLabel: "danh hiệu",
  titleField: "name",
  subtitleField: "rarity",
  updateMethod: "PUT",
  idInQuery: true,
  params: { type: "title" },
  extra: { type: "title" },
  fields: [
    { name: "name", label: "Tên danh hiệu", required: true },
    { name: "color", label: "Màu chữ", placeholder: "#f59e0b" },
    { name: "rarity", label: "Độ hiếm" },
    { name: "price", label: "Giá", type: "number" },
  ],
};

export const WEAPONS: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/weapons",
  listKey: "weapons",
  itemLabel: "vũ khí",
  titleField: "name",
  subtitleField: "weapon_type",
  updateMethod: "POST",
  // Cột phụ kiện đọc về có thể là null, mà lược đồ ghi chỉ nhận mảng.
  normalize: (payload) => ({
    ...payload,
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
  }),
  fields: [
    { name: "name", label: "Tên vũ khí", required: true },
    { name: "slug", label: "Slug", required: true, hint: "Chỉ a-z, 0-9 và gạch nối." },
    { name: "image_url", label: "Ảnh", type: "image", bucket: "logos", required: true },
    {
      name: "weapon_type",
      label: "Thể loại",
      type: "select",
      options: [
        { value: "ar", label: "Súng trường (AR)" },
        { value: "smg", label: "Tiểu liên (SMG)" },
        { value: "sniper", label: "Bắn tỉa" },
        { value: "marksman", label: "Bán tự động (DMR)" },
        { value: "shotgun", label: "Shotgun" },
        { value: "lmg", label: "Trung liên (LMG)" },
        { value: "pistol", label: "Súng lục" },
        { value: "launcher", label: "Súng phóng" },
        { value: "melee", label: "Cận chiến" },
        { value: "throwable", label: "Vật ném" },
      ],
    },
    { name: "description", label: "Mô tả", type: "textarea", rows: 4 },
    { name: "damage", label: "Sát thương", type: "number" },
    { name: "range", label: "Tầm bắn", type: "number" },
    { name: "rate_of_fire", label: "Tốc độ bắn", type: "number" },
    { name: "reload", label: "Nạp đạn", type: "number" },
    { name: "magazine", label: "Băng đạn", type: "number" },
    { name: "ob", label: "Phiên bản (OB)" },
    { name: "released_at", label: "Ra mắt" },
  ],
};

export const LOADOUTS: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/loadouts",
  listKey: "loadouts",
  itemLabel: "combo súng",
  titleField: "name",
  subtitleField: "playstyle",
  updateMethod: "POST",
  fields: [
    { name: "name", label: "Tên combo", required: true },
    { name: "slug", label: "Slug", required: true },
    { name: "image_url", label: "Ảnh", type: "image", bucket: "logos" },
    {
      name: "playstyle",
      label: "Lối chơi",
      type: "select",
      options: [
        { value: "rush", label: "Rush / Áp sát" },
        { value: "sniper", label: "Bắn tỉa" },
        { value: "support", label: "Hỗ trợ" },
        { value: "balanced", label: "Cân bằng" },
        { value: "defensive", label: "Phòng thủ" },
      ],
    },
    { name: "description", label: "Mô tả", type: "textarea", rows: 4 },
    { name: "position", label: "Thứ tự", type: "number" },
  ],
};

export const CONTRIBUTORS: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/contributors",
  listKey: "contributors",
  itemLabel: "người đóng góp",
  titleField: "display_name",
  subtitleField: "badge",
  idField: "user_id",
  updateMethod: "PATCH",
  canCreate: false,
  canDelete: false,
  fields: [
    { name: "total_points", label: "Tổng điểm", type: "number" },
    {
      name: "badge",
      label: "Danh hiệu",
      type: "select",
      options: [
        { value: "member", label: "Thành viên" },
        { value: "regular", label: "Thường xuyên" },
        { value: "veteran", label: "Kỳ cựu" },
        { value: "expert", label: "Chuyên gia" },
        { value: "legend", label: "Huyền thoại" },
      ],
    },
    { name: "posts_count", label: "Số bài viết", type: "number" },
    { name: "replies_count", label: "Số trả lời", type: "number" },
    { name: "wiki_count", label: "Số bài wiki", type: "number" },
  ],
};

export const TIER_LISTS: RowResourceConfig = {
  kind: "rows",
  endpoint: "/api/admin/tier-lists",
  listKey: "lists",
  itemLabel: "tier list",
  titleField: "title",
  subtitleField: "slug",
  canCreate: false,
  emptyHint: "Chưa có tier list nào. Tạo mới cần kéo thả nên làm trên web.",
  fields: [],
};
