import type {
  ListingKind,
  ListingStatus,
  OrderEventType,
  OrderParty,
  OrderStatus,
  SellerStatus,
  StaffStatus,
} from "@/lib/constants/shop";

export type ShopSeller = {
  id: string;
  user_id: string;
  display_name: string;
  real_name: string;
  phone: string;
  contact: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  id_images: string[];
  note: string | null;
  status: SellerStatus;
  reject_reason: string | null;
  orders_done: number;
  rating_sum: number;
  rating_count: number;
  approved_at: string | null;
  created_at: string;
};

/**
 * Hồ sơ người bán như danh sách admin nhận được: SĐT/liên hệ/STK đã che, ảnh
 * giấy tờ không đi kèm. Bản đầy đủ lấy riêng qua GET /api/shop/sellers/[id].
 */
export type AdminSellerRow = Omit<ShopSeller, "id_images"> & {
  id_images: never[];
  id_images_count: number;
};

/** Hồ sơ người bán rút gọn — an toàn để lộ ra trang công khai. */
export type PublicSeller = {
  id: string;
  user_id: string;
  display_name: string;
  /** Chỉ có mặt trong ngữ cảnh một đơn hàng — xem toPublicSeller(). */
  contact?: string;
  orders_done: number;
  rating: number | null;
  rating_count: number;
  created_at: string;
};

// ── CTV của gian hàng ──────────────────────────────────────────────────────
export type ShopStaff = {
  id: string;
  seller_id: string;
  user_id: string;
  invited_by: string | null;
  can_manage_listings: boolean;
  can_handle_orders: boolean;
  status: StaffStatus;
  note: string | null;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

/** Một dòng CTV trong bảng của chủ shop — kèm tên người được mời. */
export type ShopStaffRow = ShopStaff & {
  member: { display_name: string; handle: string | null; avatar_url: string | null } | null;
};

/** Lời mời / chỗ làm của chính người đang xem — kèm tên gian hàng. */
export type ShopStaffMembership = ShopStaff & {
  shop: { id: string; display_name: string; status: SellerStatus } | null;
};

/**
 * Quyền của một người trên một gian hàng cụ thể.
 *
 * Chủ shop luôn có đủ hai quyền; CTV chỉ có phần chủ shop bật. Mọi chỗ trong
 * API cần hỏi "người này được làm gì với shop kia" đều đi qua kiểu này thay vì
 * tự so `seller.user_id === userId`.
 */
export type SellerAccess = {
  seller: ShopSeller;
  isOwner: boolean;
  /** Dòng trong `shop_staff` — null nếu là chủ shop. */
  staffId: string | null;
  canManageListings: boolean;
  canHandleOrders: boolean;
};

export type ShopListing = {
  id: string;
  seller_id: string;
  kind: ListingKind;
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  images: string[];
  details: Record<string, string | number | boolean>;
  game_uid: string | null;
  status: ListingStatus;
  reject_reason: string | null;
  views: number;
  created_at: string;
  sold_at: string | null;
  /** Lần đẩy tin gần nhất — thứ tự "mới nhất" trên chợ đọc cột này. */
  bumped_at: string | null;
  /** Còn hạn ⇒ tin được ghim ở dải nổi bật đầu trang. */
  featured_until: string | null;
  /** Người bán đã xin đẩy nổi bật và đang chờ admin duyệt. NULL = không xin. */
  featured_requested_at: string | null;
  seller?: PublicSeller | null;
};

export type ShopOrder = {
  id: string;
  code: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  agent_id: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_contact: string;
  buyer_bank: string | null;
  amount: number;
  fee: number;
  payout_amount: number;
  status: OrderStatus;
  cancel_reason: string | null;
  created_at: string;
  claimed_at: string | null;
  held_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  listing?: Pick<ShopListing, "id" | "title" | "images" | "kind"> | null;
  seller?: PublicSeller | null;
};

export type ShopOrderEvent = {
  id: string;
  order_id: string;
  actor_id: string | null;
  actor_role: OrderParty;
  type: OrderEventType;
  message: string;
  images: string[];
  /** Thông tin bàn giao (tài khoản/mật khẩu) — chỉ trả về cho người trong đơn */
  secret: Record<string, string> | null;
  created_at: string;
};

export type ShopDispute = {
  id: string;
  order_id: string;
  opened_by: string | null;
  opened_role: "buyer" | "seller" | "agent";
  reason: string;
  images: string[];
  status: "open" | "resolving" | "refund_buyer" | "pay_seller" | "closed";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type ShopReview = {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

/** Vai trò của người đang xem trong một đơn cụ thể. */
export type ViewerParty = OrderParty | null;
