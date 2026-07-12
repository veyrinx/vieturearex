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
    version: "1.1.0",
    date: "2026-07-12",
    changes: [
      { type: "feature", text: "Dashboard admin: báo cáo đăng ký (ai đăng ký · tên · lượt xem), biểu đồ đăng ký 14 ngày, xuất CSV" },
      { type: "feature", text: "Trang lịch sử phiên bản (changelog) + badge version tự đổi mỗi lần deploy" },
      { type: "improvement", text: "Sidebar admin chia nhóm (Tổng quan/Nội dung/Cộng đồng/Người dùng/Hệ thống) + icon từng mục" },
      { type: "feature", text: "Công cụ người chơi: Chỉnh độ nhạy (/do-nhay) tự nhận diện máy, Tier List nhân vật (/tier-list), Combo kỹ năng (/combo)" },
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
