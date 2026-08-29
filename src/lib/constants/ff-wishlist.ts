/**
 * Công cụ gắn danh sách mong muốn (wishlist) Free Fire — kiểu dữ liệu và nhãn
 * dùng chung cho bảng quản trị.
 *
 * Cách chạy: người trực dán acc của người chơi vào công cụ, HỆ THỐNG đăng nhập
 * qua API rồi thêm/bớt món theo ID vật phẩm. Không ai phải mở game, và mật khẩu
 * không được lưu xuống đâu cả — xem `lib/server/ff-wishlist.ts`.
 *
 * File thuần, không import server: client bundle nạp được.
 */

export const WISHLIST_METHODS = ["dat", "guest"] as const;
export type WishlistMethod = (typeof WISHLIST_METHODS)[number];

export const WISHLIST_METHOD_LABEL: Record<WishlistMethod, string> = {
  dat: "Tệp .dat (tài khoản khách)",
  guest: "UID khách + mật khẩu",
};

/** Sức chứa wishlist trong game. */
export const WISHLIST_CAPACITY = 100;

/** Tệp guest thật chỉ vài KB. */
export const WISHLIST_DAT_MAX_BYTES = 256 * 1024;

/** Phiên đăng nhập đã niêm phong — client cầm chuỗi này, không cầm token game. */
export type WishlistSessionInfo = {
  /** Chuỗi niêm phong, gửi lại kèm mỗi lượt gọi. */
  session: string;
  uid: string;
  region: string | null;
  /** Hết hạn (ISO) — hết thì đăng nhập lại. */
  expires_at: string;
};

export type WishlistItem = {
  id: string;
  name: string | null;
  rarity: string | null;
  icon: string;
};

/** Nhãn độ hiếm theo cách gọi của kho vật phẩm. */
export const WISHLIST_RARITY_LABEL: Record<string, string> = {
  White: "COMMON",
  Green: "UNCOMMON",
  Blue: "RARE",
  Purple: "EPIC",
  Purple_Plus: "EPIC++",
  Orange: "MYTHIC",
  Orange_Plus: "MYTHIC++",
  Red: "ARTIFACT",
  Card: "CARD",
  NONE: "—",
};

export const WISHLIST_RARITY_TONE: Record<string, string> = {
  White: "border-border bg-muted text-muted-foreground",
  Green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Blue: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Purple: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Purple_Plus: "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-300",
  Orange: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Orange_Plus: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
  Red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  Card: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function rarityLabel(rare: string | null | undefined): string | null {
  if (!rare) return null;
  return WISHLIST_RARITY_LABEL[rare] ?? rare;
}

export function rarityTone(rare: string | null | undefined): string {
  if (!rare) return "border-border bg-muted text-muted-foreground";
  return WISHLIST_RARITY_TONE[rare] ?? "border-border bg-muted text-muted-foreground";
}

/** ID vật phẩm Free Fire — chỉ chữ số, dài vừa phải. */
export function isValidWishlistItemId(id: string): boolean {
  return /^\d{1,12}$/.test(id);
}

export function vnDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
}
