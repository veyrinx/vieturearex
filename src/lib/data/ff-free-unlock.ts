// Cách nhận nhân vật Free Fire miễn phí (tham khảo cộng đồng — admin cập nhật).

export type UnlockMethod = { title: string; desc: string };

export const FREE_METHODS: UnlockMethod[] = [
  { title: "Đăng nhập mỗi ngày", desc: "Nhiều mùa có sự kiện tặng nhân vật/mảnh khi đăng nhập đủ ngày." },
  { title: "Nhiệm vụ & sự kiện", desc: "Hoàn thành nhiệm vụ web-event / in-game để đổi mảnh nhân vật." },
  { title: "Token / phiếu đổi", desc: "Gom token sự kiện đổi lấy nhân vật trong shop sự kiện." },
  { title: "Vòng quay miễn phí", desc: "Một số sự kiện cho lượt quay free có cơ hội trúng nhân vật." },
  { title: "Mốc chi tiêu / đăng ký", desc: "Phần thưởng mốc (không bắt buộc nạp) hoặc quà tân thủ." },
];

// Nhân vật thường dễ sở hữu / hay được tặng free (tên khớp FF_CHARACTERS nếu có).
export const FREE_FRIENDLY: { name: string; note: string }[] = [
  { name: "Kelly", note: "Nhân vật khởi đầu, mở khoá sớm — tăng tốc chạy." },
  { name: "Moco", note: "Hay tặng qua sự kiện tân thủ — đánh dấu địch." },
  { name: "Andrew", note: "Dễ mở khoá — giảm hao mòn giáp." },
  { name: "Kla", note: "Quà mốc/sự kiện — tăng sát thương đấm." },
  { name: "Rafael", note: "Thường xuất hiện trong sự kiện đổi token." },
];
