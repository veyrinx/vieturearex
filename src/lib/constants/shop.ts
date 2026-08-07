/**
 * Chợ Arex — mua bán acc & vật phẩm Free Fire có trung gian giữ tiền.
 *
 * Đây là nguồn dữ liệu dùng chung cho cả client lẫn server: trạng thái đơn,
 * nhãn tiếng Việt, ai được làm gì ở bước nào, và bước nào bắt buộc ảnh chụp.
 * Mọi kiểm tra ở API đều đọc từ `ORDER_FLOW` để hai bên không lệch nhau.
 */

// ── Người bán ──────────────────────────────────────────────────────────────
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

export const SELLER_STATUS_LABEL: Record<SellerStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  suspended: "Tạm khoá",
};

// ── Tin đăng ───────────────────────────────────────────────────────────────
export type ListingKind = "account" | "item";
export type ListingStatus = "pending" | "active" | "reserved" | "sold" | "rejected" | "hidden";

export const LISTING_KIND_LABEL: Record<ListingKind, string> = {
  account: "Tài khoản",
  item: "Vật phẩm",
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  pending: "Chờ duyệt",
  active: "Đang bán",
  reserved: "Đang giao dịch",
  sold: "Đã bán",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

/** Tin người mua nhìn thấy ở /shop. */
export const PUBLIC_LISTING_STATUSES: ListingStatus[] = ["active", "reserved", "sold"];

// ── Đơn hàng ───────────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending_agent"
  | "awaiting_payment"
  | "payment_review"
  | "holding"
  | "delivering"
  | "payout"
  | "completed"
  | "disputed"
  | "cancelled";

export type OrderParty = "buyer" | "seller" | "agent" | "admin" | "system";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_agent: "Chờ giao dịch viên",
  awaiting_payment: "Chờ chuyển tiền",
  payment_review: "Đang soát tiền",
  holding: "Trung gian đang giữ tiền",
  delivering: "Đang bàn giao",
  payout: "Chờ trả tiền người bán",
  completed: "Hoàn tất",
  disputed: "Đang tranh chấp",
  cancelled: "Đã huỷ",
};

/** Mô tả cho người dùng hiểu đang chờ ai làm gì. */
export const ORDER_STATUS_HINT: Record<OrderStatus, string> = {
  pending_agent: "Đơn vừa tạo, đang chờ một giao dịch viên của Arex nhận xử lý.",
  awaiting_payment: "Giao dịch viên đã gửi số tài khoản. Người mua chuyển tiền rồi chụp bill lên.",
  payment_review: "Người mua đã gửi bill. Giao dịch viên đang đối chiếu tiền vào.",
  holding: "Tiền đã nằm ở trung gian. Người bán bàn giao acc/vật phẩm kèm ảnh chụp.",
  delivering: "Người bán đã bàn giao. Người mua đăng nhập kiểm tra rồi chụp màn hình xác nhận.",
  payout: "Người mua đã xác nhận. Giao dịch viên chuyển tiền cho người bán.",
  completed: "Đơn xong. Tiền đã về tay người bán, acc/vật phẩm đã về tay người mua.",
  disputed: "Có khiếu nại. Tiền vẫn bị giữ cho tới khi admin xử lý xong.",
  cancelled: "Đơn đã huỷ. Nếu đã chuyển tiền, trung gian hoàn lại cho người mua.",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending_agent: "text-slate-500 bg-slate-500/10 border-slate-500/30",
  awaiting_payment: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  payment_review: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  holding: "text-sky-500 bg-sky-500/10 border-sky-500/30",
  delivering: "text-violet-500 bg-violet-500/10 border-violet-500/30",
  payout: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  completed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  disputed: "text-red-500 bg-red-500/10 border-red-500/30",
  cancelled: "text-muted-foreground bg-muted border-border",
};

/** Đơn còn đang chạy (chưa xong, chưa huỷ). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending_agent", "awaiting_payment", "payment_review", "holding", "delivering", "payout", "disputed",
];

// ── Nhật ký & bằng chứng ───────────────────────────────────────────────────
export type OrderEventType =
  | "created"
  | "claimed"
  | "bank_info"
  | "payment_proof"
  | "payment_confirmed"
  | "account_info"
  | "delivered"
  | "login_proof"
  | "received"
  | "payout_proof"
  | "completed"
  | "cancelled"
  | "dispute_opened"
  | "dispute_resolved"
  | "note";

export const ORDER_EVENT_LABEL: Record<OrderEventType, string> = {
  created: "Tạo đơn",
  claimed: "Giao dịch viên nhận đơn",
  bank_info: "Gửi thông tin chuyển khoản",
  payment_proof: "Ảnh chuyển tiền của người mua",
  payment_confirmed: "Xác nhận đã nhận tiền",
  account_info: "Bàn giao thông tin tài khoản",
  delivered: "Người bán đã bàn giao",
  login_proof: "Ảnh đăng nhập / nhận hàng",
  received: "Người mua xác nhận nhận đủ",
  payout_proof: "Ảnh chuyển tiền cho người bán",
  completed: "Hoàn tất đơn",
  cancelled: "Huỷ đơn",
  dispute_opened: "Mở tranh chấp",
  dispute_resolved: "Xử lý tranh chấp",
  note: "Ghi chú",
};

/**
 * Các bước chuyển trạng thái hợp lệ.
 * `by`: ai được bấm. `images`: số ảnh tối thiểu phải chụp kèm.
 */
export type OrderAction = {
  key: string;
  from: OrderStatus;
  to: OrderStatus;
  by: OrderParty[];
  event: OrderEventType;
  /** Nhãn nút bấm */
  label: string;
  /** Ảnh bắt buộc — 0 là không cần */
  images: number;
  /** Bắt buộc nhập nội dung (số tài khoản, thông tin acc…) */
  requireMessage?: boolean;
};

export const ORDER_FLOW: OrderAction[] = [
  {
    key: "claim",
    from: "pending_agent", to: "awaiting_payment", by: ["agent", "admin"],
    event: "claimed", label: "Nhận đơn & gửi STK trung gian",
    images: 0, requireMessage: true,
  },
  {
    key: "pay",
    from: "awaiting_payment", to: "payment_review", by: ["buyer"],
    event: "payment_proof", label: "Tôi đã chuyển tiền (gửi ảnh bill)",
    images: 1,
  },
  {
    key: "confirm_payment",
    from: "payment_review", to: "holding", by: ["agent", "admin"],
    event: "payment_confirmed", label: "Đã nhận đủ tiền — giữ tiền",
    images: 1,
  },
  {
    key: "deliver",
    from: "holding", to: "delivering", by: ["seller"],
    event: "account_info", label: "Bàn giao acc/vật phẩm (kèm ảnh)",
    images: 1, requireMessage: true,
  },
  {
    key: "received",
    from: "delivering", to: "payout", by: ["buyer"],
    event: "login_proof", label: "Đã đăng nhập / nhận được (gửi ảnh)",
    images: 1,
  },
  {
    key: "payout",
    from: "payout", to: "completed", by: ["agent", "admin"],
    event: "payout_proof", label: "Đã chuyển tiền cho người bán",
    images: 1,
  },
];

/** Ai cũng có thể mở tranh chấp khi tiền đang bị giữ. */
export const DISPUTABLE_STATUSES: OrderStatus[] = ["holding", "delivering", "payout"];

/** Huỷ được khi tiền chưa vào hoặc còn giữ (huỷ sau khi giữ ⇒ hoàn tiền). */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  "pending_agent", "awaiting_payment", "payment_review", "holding",
];

export function actionsFor(status: OrderStatus, party: OrderParty): OrderAction[] {
  return ORDER_FLOW.filter((a) => a.from === status && a.by.includes(party));
}

// ── Phí trung gian ─────────────────────────────────────────────────────────
/** Phí 5%, tối thiểu 10.000đ, tối đa 200.000đ — trừ vào tiền người bán nhận. */
export const FEE_PERCENT = 5;
export const FEE_MIN = 10_000;
export const FEE_MAX = 200_000;

export function calcFee(amount: number): number {
  const raw = Math.round((amount * FEE_PERCENT) / 100);
  return Math.min(FEE_MAX, Math.max(FEE_MIN, raw));
}

export function calcPayout(amount: number): number {
  return Math.max(0, amount - calcFee(amount));
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

// ── Giới hạn nhập liệu ─────────────────────────────────────────────────────
export const MAX_LISTING_IMAGES = 8;
export const MAX_EVENT_IMAGES = 6;
export const MIN_PRICE = 10_000;
export const MAX_PRICE = 500_000_000;
