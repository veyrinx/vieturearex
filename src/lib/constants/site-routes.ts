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
  "/lich-noi-dung",
  "/dang-hot",
  "/cap-nhat",
  "/gui-bai-viet",
  "/dang-ky-tin",

  // ── Esports & giải đấu ──────────────────────────────────────────────────
  "/esports",
  "/esports/vod",
  "/tournaments",
  "/tournaments/my-team",
  "/tournaments/propose",
  "/giai-dau-cong-dong",
  "/leaderboard",
  "/tuyen-thanh-vien",
  "/team",

  // ── Cộng đồng ───────────────────────────────────────────────────────────
  "/cong-dong",
  "/cong-dong/cosmetics",
  "/cong-dong/xu-huong",
  "/feed",
  "/binh-chon",
  "/notifications",
  "/yeu-thich",
  "/profile",
  "/gallery",

  // ── Công cụ / tra cứu ───────────────────────────────────────────────────
  "/cong-cu",
  "/tra-cuu-nick",
  "/so-sanh-nick",
  "/tra-cuu-guild",
  "/dinh-gia-nick",
  "/bxh-nick",
  "/bxh-nick-vn",
  "/bxh-quiz",
  "/quiz",
  "/tao-ten",
  "/tinh-kd",
  "/tinh-nap",
  "/do-nhay",
  "/combo",
  "/trang-thai",
  "/dem-nguoc",
  "/nap-an-toan",
  "/players/compare",
  "/search",

  // ── Wiki / vũ khí / nhân vật / vật phẩm ─────────────────────────────────
  "/wiki",
  "/wiki/tao-bai",
  "/vu-khi",
  "/vu-khi/loadout",
  "/vu-khi/so-sanh",
  "/nhan-vat",
  "/nhan-vat/so-sanh",
  "/nhan-vat-mien-phi",
  "/tier-list",
  "/tier-lists",
  "/items",

  // ── Cửa hàng / tích hợp ─────────────────────────────────────────────────
  "/cua-hang-prime",
  "/tiktok",
  "/lien-ket-telegram",
  "/hop-tac",

  // ── Tài khoản / hệ thống ────────────────────────────────────────────────
  "/login",
  "/register",
  "/join",
  "/setup",
  "/sap-ra-mat",
  "/dang-cap-nhat",

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
