// Lịch nội dung Free Fire sắp ra (roadmap) — admin cập nhật.
// type: "Nhân vật" | "Skin" | "Chế độ" | "Sự kiện" | "Bản cập nhật"

export type RoadmapItem = {
  date: string;   // ISO +07:00
  type: string;
  title: string;
  note?: string;
};

export const FF_ROADMAP: RoadmapItem[] = [
  // ⬇️ Ví dụ — admin sửa theo thông tin chính thức/leak
  { date: "2026-08-13T00:00:00+07:00", type: "Bản cập nhật", title: "Phiên bản OB mới", note: "Cân bằng vũ khí + nhân vật mới" },
  { date: "2026-08-20T00:00:00+07:00", type: "Nhân vật", title: "Nhân vật hợp tác mới", note: "Kỹ năng hỗ trợ" },
  { date: "2026-09-01T00:00:00+07:00", type: "Chế độ", title: "Chế độ chơi mùa mới", note: "Sự kiện giới hạn thời gian" },
];
