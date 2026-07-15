// Trạng thái máy chủ Free Fire (trang fan — tham khảo, không phải API chính thức).
// Admin cập nhật: sửa lịch bảo trì + (tuỳ chọn) ép trạng thái thủ công.

export type MaintenanceWindow = {
  start: string;   // ISO +07:00
  end: string;     // ISO +07:00
  note?: string;
  region?: string; // vd "VN" | "SEA"
};

export type ServerStatusKind = "operational" | "maintenance" | "issues";

export const SERVER_STATUS: {
  // Ép trạng thái thủ công (khi có sự cố ngoài lịch). null = tự tính theo lịch.
  manualOverride: { status: ServerStatusKind; message: string } | null;
  maintenance: MaintenanceWindow[];
} = {
  manualOverride: null,
  maintenance: [
    // ⬇️ Ví dụ — admin sửa theo lịch thật của Garena
    { start: "2026-08-13T09:00:00+07:00", end: "2026-08-13T13:00:00+07:00", note: "Cập nhật phiên bản OB mới", region: "VN" },
  ],
};
