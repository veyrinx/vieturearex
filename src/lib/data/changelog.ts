// Lịch sử phiên bản — mỗi lần cập nhật web thêm 1 mục vào ĐẦU mảng.
// type: feature (tính năng mới) · improvement (cải tiến) · fix (sửa lỗi)

export type ChangeType = "feature" | "improvement" | "fix";

export type ChangelogEntry = {
  version: string;
  date: string; // YYYY-MM-DD
  changes: { type: ChangeType; text: string }[];
};

export const CHANGE_META: Record<ChangeType, { label: string; cls: string }> = {
  feature:     { label: "Mới",      cls: "bg-emerald-500/12 text-emerald-500" },
  improvement: { label: "Cải tiến", cls: "bg-blue-500/12 text-blue-500" },
  fix:         { label: "Sửa lỗi",  cls: "bg-amber-500/12 text-amber-500" },
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2026-08-23",
    changes: [
      { type: "feature", text: "Theo Dõi Nick Free Fire (/theo-doi-nick): ghim nick, nhận báo khi đổi tên, đổi guild, lên level hay đổi điểm rank — kèm lịch sử đổi tên để nhận ra acc đã qua nhiều chủ" },
      { type: "feature", text: "Check Scam (/check-scam) chạy thật trở lại: tra SĐT, số tài khoản, UID game, Zalo/Facebook trong hồ sơ rủi ro sinh từ tranh chấp chợ Arex đã xử" },
      { type: "feature", text: "Nhiệm Vụ Tuần (/nhiem-vu): đăng bài, bình luận, đóng góp wiki, điểm danh — làm xong nhận điểm đóng góp, làm mới mỗi thứ Hai" },
      { type: "feature", text: "Bảng theo dõi giải trực tiếp (/tournaments/[slug]/live): tỉ số, lịch trận và bảng xếp hạng tự cập nhật trong ngày thi đấu" },
      { type: "feature", text: "Khoảng giá tham chiếu trong chợ Arex: dựng từ đơn ĐÃ chốt (không phải giá rao), hiện khi đăng bán và ở trang chi tiết" },
      { type: "feature", text: "Quản trị Hồ Sơ Rủi Ro (/admin/scam-reports) để rà soát, thêm và gỡ cảnh báo scam" },
      { type: "improvement", text: "Báo Telegram khi một vòng đấu kết thúc — chỉ bắn 1 tin mỗi vòng, không spam từng trận" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-07-15",
    changes: [
      { type: "feature", text: "Khu Vũ khí (/weapons): chỉ số chi tiết, tìm/lọc theo thể loại & tier, so sánh 2 vũ khí, phụ kiện gợi ý, lịch sử tier" },
      { type: "feature", text: "Combo vũ khí (/weapons/loadout): các bộ súng chính + phụ theo lối chơi (rush, bắn tỉa, hỗ trợ...)" },
      { type: "feature", text: "Khu Nhân vật (/characters): kỹ năng chủ động/bị động, tier, vai trò, so sánh 2 nhân vật" },
      { type: "improvement", text: "Thư viện Icon (/items): 49 thể loại chuẩn + tên thật + độ hiếm cho từng icon, lọc theo loại/độ hiếm/OB" },
      { type: "improvement", text: "Tìm kiếm toàn site (/search) giờ tìm được cả vũ khí, combo và nhân vật" },
      { type: "improvement", text: "Ảnh chia sẻ (OG) đẹp + breadcrumb cho trang vũ khí & nhân vật (tốt cho Google)" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-12",
    changes: [
      { type: "feature", text: "Dashboard admin: báo cáo đăng ký (ai đăng ký · tên · lượt xem), biểu đồ đăng ký 14 ngày, xuất CSV" },
      { type: "feature", text: "Trang lịch sử phiên bản (changelog) + badge version tự đổi mỗi lần deploy" },
      { type: "improvement", text: "Sidebar admin chia nhóm (Tổng quan/Nội dung/Cộng đồng/Người dùng/Hệ thống) + icon từng mục" },
      { type: "feature", text: "Dashboard: panel 'Cần xử lý' (bình luận/diễn đàn/đơn gia nhập đang chờ) + link nhanh" },
      { type: "feature", text: "Stat card hiển thị % tăng trưởng 7 ngày (người dùng / tin tức / lượt xem)" },
      { type: "feature", text: "Tìm nhanh trong admin (Ctrl+K) — gõ để nhảy tới bất kỳ trang quản trị" },
      { type: "feature", text: "Công cụ người chơi: Chỉnh độ nhạy (/sensitivity) tự nhận diện máy, Tier List nhân vật (/tier-list), Combo kỹ năng (/combo)" },
      { type: "improvement", text: "Thư viện icon /items dùng đủ ~33.399 icon, phục vụ ảnh qua domain (proxy /api/ff-icon)" },
      { type: "feature", text: "Trang chi tiết từng item /items/[id] + nút tải ảnh PNG trong admin" },
      { type: "improvement", text: "Đồng bộ toàn bộ 33.399 icon về Supabase Storage" },
      { type: "fix", text: "Sửa lỗi Brave translate 400 (chỉ nạp Google Translate khi cần EN)" },
      { type: "fix", text: "Sửa khoảng hở phía trên thanh điều hướng (header)" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-07-10",
    changes: [
      { type: "feature", text: "Ra mắt cổng cộng đồng Arex Network: tin tức, sự kiện, esports, diễn đàn, wiki, thư viện icon" },
      { type: "feature", text: "Menu điều hướng mobile gọn (menu 3 gạch nhóm), banner console + cookie consent + PWA" },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "1.0.0";
