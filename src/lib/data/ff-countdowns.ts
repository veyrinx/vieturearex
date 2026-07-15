// Đếm ngược sự kiện / mốc Free Fire.
// Admin cập nhật: sửa/thêm mốc vào mảng dưới (date ISO, có múi giờ +07:00).
// Mốc đã qua sẽ tự ẩn ở trang /dem-nguoc.

export type FFCountdown = {
  label: string;
  date: string;   // ISO, ví dụ "2026-08-13T09:00:00+07:00"
  note?: string;
  tag?: string;   // Update | Rank | Sự kiện | Bảo trì ...
};

export const FF_COUNTDOWNS: FFCountdown[] = [
  // ⬇️ Ví dụ — admin sửa lại theo lịch thật của Free Fire
  { label: "Reset rank cuối mùa", date: "2026-07-31T23:59:00+07:00", note: "Leo rank trước khi reset để nhận thưởng!", tag: "Rank" },
  { label: "Cập nhật máy chủ (OB mới)", date: "2026-08-13T09:00:00+07:00", note: "Bảo trì ~4 tiếng, không vào game được", tag: "Update" },
  { label: "Sự kiện cuối tuần", date: "2026-07-19T19:00:00+07:00", tag: "Sự kiện" },
];
