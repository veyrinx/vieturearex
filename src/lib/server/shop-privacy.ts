import "server-only";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { decryptSecret } from "@/lib/server/shop-crypto";
import type {
  AdminSellerRow,
  ShopOrder,
  ShopOrderEvent,
  ShopSeller,
  ViewerParty,
} from "@/lib/types/shop";

/**
 * Ai được thấy gì trong chợ Arex.
 *
 * Nguyên tắc: dữ liệu cá nhân chỉ đi tới đúng người cần nó để làm xong việc
 * của bước hiện tại, không hơn.
 *
 *   người mua            → thấy đủ thông tin của chính mình
 *   giao dịch viên NHẬN  → thấy đủ (phải gọi điện, đối chiếu chuyển khoản)
 *   giao dịch viên KHÁC  → chỉ thấy đơn ở dạng ẩn danh trong hàng chờ
 *   người bán            → KHÔNG thấy SĐT / STK / kênh liên hệ người mua
 *   admin                → thấy đủ, nhưng mỗi lần xem giấy tờ đều bị ghi log
 *
 * Che ở tầng server (chỗ này) chứ không phải ở giao diện: cái gì không gửi
 * xuống trình duyệt thì không ai mở DevTools ra xem được.
 */

// ── Che chuỗi ──────────────────────────────────────────────────────────────
/** 0912345678 → 0912***678 */
export function maskPhone(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.length <= 4) return "***";
  return `${v.slice(0, 4)}${"*".repeat(Math.max(3, v.length - 7))}${v.slice(-3)}`;
}

/** Giữ lại 3 số cuối của mọi dãy số dài (số tài khoản nằm lẫn trong text tự do). */
export function maskAccountNumbers(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.replace(/\d{6,}/g, (digits) => `${"*".repeat(digits.length - 3)}${digits.slice(-3)}`);
}

/** zalo 0912345678 / an.nguyen@gmail.com → giữ đầu, giấu đuôi. */
export function maskContact(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.includes("@")) {
    const [name, domain] = v.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return maskAccountNumbers(v.length > 6 ? `${v.slice(0, 4)}${"*".repeat(v.length - 6)}${v.slice(-2)}` : "***");
}

// ── Đơn hàng ───────────────────────────────────────────────────────────────
export type OrderViewer = {
  userId: string | null;
  party: ViewerParty;
};

/** Giao dịch viên đã cầm đơn này, hay chỉ là người đang ngó hàng chờ? */
function isAssignedAgent(order: ShopOrder, viewer: OrderViewer): boolean {
  return viewer.party === "agent" && !!viewer.userId && order.agent_id === viewer.userId;
}

/** Được xem thông tin liên hệ đầy đủ của người mua hay không. */
export function canSeeBuyerContact(order: ShopOrder, viewer: OrderViewer): boolean {
  if (viewer.party === "admin") return true;
  if (viewer.party === "buyer") return true;
  return isAssignedAgent(order, viewer);
}

/**
 * Cắt bớt thông tin người mua theo vai người xem. Trả về bản sao — không sửa
 * vào đối tượng gốc vì nó còn được dùng để kiểm tra quyền ở chỗ khác.
 */
export function redactOrder(order: ShopOrder, viewer: OrderViewer): ShopOrder {
  const seeBuyer = canSeeBuyerContact(order, viewer);
  // Kênh liên hệ của người bán: giấu với người mua. Chợ này có trung gian giữ
  // tiền — hai bên nói chuyện riêng ngoài sàn là đường ngắn nhất tới lừa đảo.
  const seeSeller =
    viewer.party === "admin" || viewer.party === "seller" || isAssignedAgent(order, viewer);

  if (seeBuyer && seeSeller) return order;

  return {
    ...order,
    // Người bán vẫn cần tên để xưng hô; số điện thoại / kênh chat / STK thì
    // không — mọi liên lạc đi qua giao dịch viên.
    buyer_phone: seeBuyer ? order.buyer_phone : maskPhone(order.buyer_phone),
    buyer_contact: seeBuyer ? order.buyer_contact : maskContact(order.buyer_contact),
    buyer_bank: seeBuyer ? order.buyer_bank : null,
    seller: order.seller
      ? { ...order.seller, contact: seeSeller ? order.seller.contact : undefined }
      : order.seller,
  };
}

export function redactOrders(orders: ShopOrder[], viewer: OrderViewer): ShopOrder[] {
  return orders.map((o) => redactOrder(o, viewer));
}

/**
 * Danh sách hàng chờ của giao dịch viên: đơn chưa ai nhận thì ẩn luôn cả tên,
 * chỉ để lại mã đơn và số tiền cho họ quyết định có nhận hay không.
 */
export function anonymizeUnclaimed(orders: ShopOrder[]): ShopOrder[] {
  return orders.map((o) =>
    o.agent_id
      ? o
      : {
          ...o,
          buyer_name: "(ẩn cho tới khi nhận đơn)",
          buyer_phone: "",
          buyer_contact: "",
          buyer_bank: null,
        },
  );
}

// ── Nhật ký đơn ────────────────────────────────────────────────────────────
/**
 * `secret` không bao giờ đi kèm lời gọi xem đơn. Thay vào đó dòng nhật ký chỉ
 * mang cờ cho biết "ở đây có thông tin đăng nhập", người xem phải bấm nút mới
 * lấy — mỗi lần bấm là một dòng trong `shop_access_logs`.
 *
 * Màn hình đơn tự làm mới 20 giây một lần; nếu cứ trả mật khẩu kèm theo thì nó
 * nằm sẵn trong bộ nhớ trình duyệt suốt buổi và log truy cập thành vô nghĩa.
 */
export type RedactedOrderEvent = Omit<ShopOrderEvent, "secret"> & {
  secret: null;
  /** Có thông tin bàn giao được cất ở dòng này. */
  has_secret: boolean;
  /** Người đang xem có quyền bấm mở hay không. */
  can_reveal: boolean;
};

/** Ai đọc được thông tin đăng nhập bàn giao ở một dòng nhật ký. */
export function canReadSecret(
  order: ShopOrder,
  viewer: OrderViewer,
  event: Pick<ShopOrderEvent, "actor_id">,
): boolean {
  if (viewer.party === "admin") return true;
  if (viewer.party === "buyer") return true; // người mua là bên nhận acc
  if (isAssignedAgent(order, viewer)) return true;
  // Người bán chỉ đọc lại đúng dòng do chính mình ghi.
  return !!viewer.userId && event.actor_id === viewer.userId;
}

export function redactOrderEvents(
  events: ShopOrderEvent[],
  order: ShopOrder,
  viewer: OrderViewer,
): RedactedOrderEvent[] {
  return events.map((e) => ({
    ...e,
    secret: null,
    has_secret: !!e.secret,
    can_reveal: !!e.secret && canReadSecret(order, viewer, e),
  }));
}

/** Mở khoá đúng một dòng nhật ký. `null` = không có quyền hoặc không có gì. */
export async function revealOrderSecret(
  event: ShopOrderEvent | null,
  order: ShopOrder,
  viewer: OrderViewer,
): Promise<Record<string, string> | null> {
  if (!event?.secret) return null;
  if (!canReadSecret(order, viewer, event)) return null;
  return decryptSecret(event.secret);
}

// ── Hồ sơ người bán ────────────────────────────────────────────────────────
/** Che giấy tờ và STK trước khi hồ sơ đi vào danh sách của admin. */
export function redactSellerForList(seller: ShopSeller): AdminSellerRow {
  return {
    ...seller,
    phone: maskPhone(seller.phone),
    contact: maskContact(seller.contact),
    bank_account: maskAccountNumbers(seller.bank_account),
    // Ảnh CCCD không bao giờ đi kèm danh sách — phải bấm xem từng hồ sơ.
    id_images: [] as never[],
    id_images_count: seller.id_images?.length ?? 0,
  };
}

export function redactSellersForList(sellers: ShopSeller[]): AdminSellerRow[] {
  return sellers.map(redactSellerForList);
}

/** Hồ sơ của chính mình: giữ nguyên, chỉ bỏ ảnh giấy tờ khỏi payload. */
export function ownSellerView(seller: ShopSeller | null): ShopSeller | null {
  return seller ? { ...seller, id_images: [] } : null;
}

// ── Nhật ký truy cập dữ liệu nhạy cảm ──────────────────────────────────────
export type SensitiveAccessKind =
  | "seller_documents"
  | "seller_bank"
  | "order_secret"
  | "private_file";

/**
 * Ghi lại việc ai đó mở dữ liệu nhạy cảm. Ghi hỏng thì im lặng bỏ qua — log là
 * để đối chiếu về sau, không được phép chặn nghiệp vụ đang chạy.
 */
export async function logSensitiveAccess(input: {
  actorId: string | null;
  actorRole: string | null;
  kind: SensitiveAccessKind;
  target: string;
  ip?: string | null;
}): Promise<void> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return;
    await untypedFrom(db, "shop_access_logs").insert({
      actor_id: input.actorId,
      actor_role: input.actorRole ?? "unknown",
      kind: input.kind,
      target: input.target.slice(0, 300),
      ip: input.ip && input.ip !== "unknown" ? input.ip : null,
    } as never);
  } catch {
    /* non-fatal */
  }
}

/** Header dùng chung cho mọi endpoint có dữ liệu cá nhân. */
export const NO_STORE = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
} as const;

/**
 * Trả JSON cho các route của chợ — luôn kèm `no-store`.
 *
 * Dùng thay `NextResponse.json` trong `src/app/api/shop/**`. Trước đây chỉ
 * nhánh thành công mới gắn header, các nhánh 401/403/404 rơi về mặc định
 * `public, max-age=0, must-revalidate` của Next. Gói chung một chỗ để route
 * mới không thể quên.
 */
export function shopJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers ?? {}) },
  });
}
