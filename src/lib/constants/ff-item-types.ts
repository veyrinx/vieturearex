// Nhãn tiếng Việt cho 49 thể loại item Free Fire (khớp dữ liệu chuẩn ShahGCreator).
// Dùng cho trang /items — auto phân loại theo file public/ff-item-types.json (id → chỉ số type).

export const FF_ITEM_TYPE_LABELS: Record<string, string> = {
  "Bundle Create": "Bộ tạo Bundle",
  "Exchange Tokens": "Token đổi",
  "Bundles": "Bộ đồ",
  "Weapon Skins": "Skin súng",
  "Top": "Áo",
  "Loot Crates": "Rương loot",
  "Bottom": "Quần",
  "Shoe": "Giày",
  "Head": "Mũ",
  "Khác": "Khác",
  "Mask": "Mặt nạ",
  "Avatars": "Avatar",
  "Banners": "Banner",
  "Voice Packs": "Gói giọng",
  "Choice Crates": "Rương chọn",
  "Vouchers": "Voucher",
  "Bag Skins": "Skin balo",
  "Emote": "Emote",
  "Facepaint": "Sơn mặt",
  "Skyboard": "Ván bay",
  "Loot Box": "Hộp loot",
  "Gloo Walls": "Tường gloo",
  "Vehicle Skins": "Skin xe",
  "Parachute": "Dù",
  "Weapon Crates": "Rương súng",
  "Grenade Skin": "Skin lựu đạn",
  "Pet Skin": "Skin pet",
  "Music": "Nhạc",
  "Pet Emote": "Emote pet",
  "Titles": "Danh hiệu",
  "Characters": "Nhân vật",
  "Arrival Animation": "Hiệu ứng ra mắt",
  "Profile Pin": "Ghim hồ sơ",
  "Fist Skins": "Skin đấm",
  "Photo Pose": "Tạo dáng",
  "Skywings": "Cánh bay",
  "Pets": "Pet",
  "Photo Frame": "Khung ảnh",
  "Sticker": "Sticker",
  "Pet Skill": "Kỹ năng pet",
  "Skill Skins": "Skin kỹ năng",
  "Look Changer": "Đổi ngoại hình",
  "Posture": "Tư thế",
  "Battle Card": "Thẻ đấu",
  "Hyper Book": "Hyper Book",
  "Final Shot": "Phát bắn cuối",
  "Finishing Move": "Đòn kết liễu",
  "Super Emote": "Super Emote",
  "Avatar Frame": "Khung avatar",
};

export function ffItemTypeLabel(type: string): string {
  return FF_ITEM_TYPE_LABELS[type] ?? type;
}

// Bảng màu xoay vòng — gán màu ổn định cho mỗi thể loại theo tên (không cần khai báo tay 49 màu).
const PALETTE: { color: string; bg: string }[] = [
  { color: "text-red-500", bg: "bg-red-500/10" },
  { color: "text-orange-500", bg: "bg-orange-500/10" },
  { color: "text-amber-500", bg: "bg-amber-500/10" },
  { color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { color: "text-teal-500", bg: "bg-teal-500/10" },
  { color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { color: "text-sky-500", bg: "bg-sky-500/10" },
  { color: "text-blue-500", bg: "bg-blue-500/10" },
  { color: "text-violet-500", bg: "bg-violet-500/10" },
  { color: "text-pink-500", bg: "bg-pink-500/10" },
];

export function ffItemTypeStyle(type: string): { color: string; bg: string } {
  if (type === "Khác") return { color: "text-muted-foreground", bg: "bg-muted" };
  let h = 0;
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
