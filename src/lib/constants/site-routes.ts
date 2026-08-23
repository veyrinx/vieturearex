// Danh sách TẤT CẢ route tĩnh của site (trang trong (site)/, không tính route
// động [param]). Dùng cho:
//  - Quản lý dự án: gợi ý path + tự tính "route đã tồn tại" (routeExists).
//  - Bất cứ nơi nào cần biết toàn bộ trang public.
// Thêm trang mới → thêm 1 dòng ở đây để dự án tương ứng tự nhảy trạng thái.

export const SITE_ROUTES: string[] = [
  // ── Trang chính & nội dung ──────────────────────────────────────────────
  "/",
  "/tin-tuc",
  "/news",
  "/su-kien",
  "/events",
  "/lich",
  "/calendar",
  "/content-roadmap",
  "/trending",
  "/changelog",
  "/submit-article",
  "/newsletter",

  // ── Esports & giải đấu ──────────────────────────────────────────────────
  "/esports",
  "/esports/vod",
  "/tournaments",
  "/tournaments/my-team",
  "/tournaments/propose",
  "/community-tournaments",
  "/leaderboard",
  "/recruitment",
  "/team",

  // ── Cộng đồng ───────────────────────────────────────────────────────────
  "/community",
  "/community/cosmetics",
  "/community/trending",
  "/feed",
  "/character-poll",
  "/notifications",
  "/favorites",
  "/profile",
  "/nhiem-vu",
  "/gallery",

  // ── Công cụ / tra cứu ───────────────────────────────────────────────────
  "/tools",
  "/player-lookup",
  "/player-compare",
  "/guild-lookup",
  "/account-value",
  "/bxh-nick",
  "/top-players-vn",
  "/quiz-leaderboard",
  "/quiz",
  "/name-generator",
  "/kd-calculator",
  "/topup-calculator",
  "/sensitivity",
  "/combo",
  "/server-status",
  "/countdown",
  "/safe-topup",
  "/check-scam",
  "/theo-doi-nick",
  "/phone-lookup",
  "/players/compare",
  "/search",

  // ── Wiki / vũ khí / nhân vật / vật phẩm ─────────────────────────────────
  "/wiki",
  "/wiki/create",
  "/weapons",
  "/weapons/loadout",
  "/weapons/compare",
  "/characters",
  "/characters/compare",
  "/free-characters",
  "/tier-list",
  "/tier-lists",
  "/items",

  // ── Cửa hàng / tích hợp ─────────────────────────────────────────────────
  "/prime-store",
  "/shop",
  "/shop/dang-ky-ban",
  "/shop/dang-tin",
  "/shop/tin-cua-toi",
  "/shop/don-hang",
  "/shop/gian-hang",
  "/shop/nhan-su",
  "/shop/ctv",
  "/tiktok",
  "/telegram-link",
  "/discord-link",
  "/partnership",
  "/partnership/hop-dong",

  // ── Tài khoản / hệ thống ────────────────────────────────────────────────
  "/login",
  "/register",
  "/join",
  "/setup",
  "/tai-app",
  "/coming-soon",
  "/updating",

  // ── Trang tĩnh / pháp lý ────────────────────────────────────────────────
  "/about",
  "/contact",
  "/lien-he",
  "/privacy-policy",
  "/chinh-sach-bao-mat",
  "/terms-of-use",
  "/dieu-khoan-su-dung",
  "/cookie-policy",
];
