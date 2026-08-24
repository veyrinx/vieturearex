import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Hồ sơ rủi ro giao dịch.
 *
 * Nguồn chính KHÔNG phải admin gõ tay mà là tranh chấp trong chợ Arex đã được
 * xử "hoàn tiền người mua" — tức đã có người thật mất tiền và đội ngũ đã kết
 * luận. Nhờ vậy /check-scam trả lời được bằng dữ liệu của chính mình thay vì
 * phụ thuộc nguồn ngoài.
 *
 * Mọi định danh lưu ở dạng ĐÃ CHUẨN HOÁ (xem `normalizeSubject`) để "0912 345
 * 678", "+84912345678" và "0912345678" tra ra cùng một hồ sơ.
 */

export type SubjectType = "uid" | "phone" | "bank" | "contact" | "name";
export type Severity = "info" | "warning" | "danger";

export const SUBJECT_LABEL: Record<SubjectType, string> = {
  uid: "UID game",
  phone: "Số điện thoại",
  bank: "Số tài khoản",
  contact: "Liên hệ (Zalo/FB/Telegram)",
  name: "Họ tên",
};

/** Bỏ dấu tiếng Việt để so tên không phụ thuộc cách gõ. */
function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Chuẩn hoá một định danh. Trả null khi giá trị không dùng được (quá ngắn,
 * sai dạng) — người gọi phải bỏ qua thay vì lưu rác.
 */
export function normalizeSubject(type: SubjectType, raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (type === "phone") {
    let digits = value.replace(/\D/g, "");
    // +84 / 84 đứng đầu → 0. Chỉ đổi khi phần còn lại đủ dài, tránh biến một
    // dãy số ngắn bắt đầu bằng 84 thành số điện thoại.
    if (digits.startsWith("84") && digits.length >= 10) digits = `0${digits.slice(2)}`;
    return digits.length >= 9 && digits.length <= 11 ? digits : null;
  }

  if (type === "bank") {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 6 ? digits : null;
  }

  if (type === "uid") {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 4 && digits.length <= 15 ? digits : null;
  }

  if (type === "contact") {
    // Nhận cả link: lấy phần định danh cuối đường dẫn.
    let v = value.toLowerCase();
    const urlMatch = v.match(/(?:facebook\.com|fb\.com|zalo\.me|t\.me)\/([^/?#\s]+)/);
    if (urlMatch) v = urlMatch[1];
    v = v.replace(/^@+/, "").replace(/\s+/g, "");
    return v.length >= 3 ? v : null;
  }

  // name
  const v = stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
  return v.length >= 3 ? v : null;
}

/** Đoán loại định danh từ ô tìm kiếm một dòng của người dùng. */
export function detectSubjectTypes(raw: string): SubjectType[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  const digits = value.replace(/\D/g, "");
  const allDigits = digits.length === value.length;

  if (allDigits) {
    const types: SubjectType[] = [];
    // Một dãy số có thể vừa là SĐT vừa là UID vừa là STK — tra cả ba rồi để
    // kết quả tự nói nó khớp kiểu nào.
    if (digits.length >= 9 && digits.length <= 11) types.push("phone");
    if (digits.length >= 4 && digits.length <= 15) types.push("uid");
    if (digits.length >= 6) types.push("bank");
    return types;
  }
  if (/^\+?\d[\d\s.-]+$/.test(value)) return ["phone", "bank"];
  if (/(facebook\.com|fb\.com|zalo\.me|t\.me|^@)/i.test(value)) return ["contact"];
  return ["contact", "name"];
}

export interface ScamHit {
  subject_type: SubjectType;
  subject_value: string;
  severity: Severity;
  note: string;
  source: "dispute" | "admin";
  created_at: string;
}

export interface ScamLookupResult {
  query: string;
  /** Các dạng định danh đã thử tra. */
  triedTypes: SubjectType[];
  hits: ScamHit[];
  /** Mức cảnh báo cao nhất trong các hit, null khi sạch. */
  worst: Severity | null;
}

/** Tra cứu một chuỗi bất kỳ. Không tìm thấy = trả mảng rỗng, KHÔNG phải lỗi. */
export async function lookupScam(query: string): Promise<ScamLookupResult> {
  const types = detectSubjectTypes(query);
  const empty: ScamLookupResult = { query, triedTypes: types, hits: [], worst: null };

  const db = createAdminSupabaseClient();
  if (!db || types.length === 0) return empty;

  const pairs = types
    .map((t) => ({ type: t, value: normalizeSubject(t, query) }))
    .filter((p): p is { type: SubjectType; value: string } => Boolean(p.value));
  if (pairs.length === 0) return empty;

  const values = [...new Set(pairs.map((p) => p.value))];

  const { data } = (await untypedFrom(db, "scam_reports")
    .select("subject_type, subject_value, severity, note, source, created_at")
    .in("subject_type", types)
    .in("subject_value", values)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: ScamHit[] | null };

  // Lọc lại theo đúng cặp (type, value): `.in()` hai chiều có thể bắt chéo, ví
  // dụ một UID trùng chữ số với một STK sẽ lọt vào kết quả nếu không lọc.
  const allowed = new Set(pairs.map((p) => `${p.type}:${p.value}`));
  const hits = (data ?? []).filter((h) => allowed.has(`${h.subject_type}:${h.subject_value}`));

  const order: Severity[] = ["info", "warning", "danger"];
  const worst = hits.reduce<Severity | null>((acc, h) => {
    if (!acc) return h.severity;
    return order.indexOf(h.severity) > order.indexOf(acc) ? h.severity : acc;
  }, null);

  return { query, triedTypes: types, hits, worst };
}

/**
 * Sinh cảnh báo từ một tranh chấp đã xử "hoàn tiền người mua".
 *
 * Ghi cả 4 định danh của người bán (SĐT, STK, liên hệ, họ tên) cộng UID game
 * của tin đăng — người mua sau thường chỉ cầm được một trong số đó.
 *
 * Nuốt lỗi: không được chặn luồng xử tranh chấp.
 */
export async function recordDisputeScam(input: {
  orderId: string;
  disputeId: string | null;
  sellerId: string;
  listingId: string | null;
  resolution: string;
}): Promise<number> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return 0;

    const { data: seller } = (await untypedFrom(db, "shop_sellers")
      .select("id, real_name, phone, contact, bank_account")
      .eq("id", input.sellerId)
      .maybeSingle()) as {
      data: {
        id: string;
        real_name: string | null;
        phone: string | null;
        contact: string | null;
        bank_account: string | null;
      } | null;
    };
    if (!seller) return 0;

    const candidates: { type: SubjectType; raw: string | null }[] = [
      { type: "phone", raw: seller.phone },
      { type: "bank", raw: seller.bank_account },
      { type: "contact", raw: seller.contact },
      { type: "name", raw: seller.real_name },
    ];

    if (input.listingId) {
      const { data: listing } = (await untypedFrom(db, "shop_listings")
        .select("game_uid")
        .eq("id", input.listingId)
        .maybeSingle()) as { data: { game_uid: string | null } | null };
      if (listing?.game_uid) candidates.push({ type: "uid", raw: listing.game_uid });
    }

    const rows = candidates
      .map((c) => ({ type: c.type, value: c.raw ? normalizeSubject(c.type, c.raw) : null }))
      .filter((c): c is { type: SubjectType; value: string } => Boolean(c.value))
      .map((c) => ({
        subject_type: c.type,
        subject_value: c.value,
        source: "dispute" as const,
        severity: "danger" as const,
        note: `Tranh chấp đơn ${input.orderId} xử hoàn tiền người mua. ${input.resolution}`.slice(0, 500),
        order_id: input.orderId,
        dispute_id: input.disputeId,
        seller_id: seller.id,
      }));

    if (rows.length === 0) return 0;

    // Chỉ mục duy nhất (dispute_id, subject_type, subject_value) chặn trùng khi
    // một tranh chấp bị xử lại.
    const { error } = (await untypedFrom(db, "scam_reports").upsert(rows as never, {
      onConflict: "dispute_id,subject_type,subject_value",
      ignoreDuplicates: true,
    })) as { error: unknown };

    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

export interface SellerTrust {
  ordersDone: number;
  ratingAvg: number | null;
  ratingCount: number;
  /** Số cảnh báo còn hiệu lực gắn với người bán này. */
  scamFlags: number;
  level: "new" | "ok" | "trusted" | "flagged";
}

/**
 * Mức uy tín người bán — gộp đơn đã xong, điểm đánh giá và số cảnh báo.
 * Có cảnh báo là 'flagged' bất kể bán được bao nhiêu đơn.
 */
export async function getSellerTrust(sellerId: string): Promise<SellerTrust | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data: seller } = (await untypedFrom(db, "shop_sellers")
    .select("orders_done, rating_sum, rating_count")
    .eq("id", sellerId)
    .maybeSingle()) as {
    data: { orders_done: number | null; rating_sum: number | null; rating_count: number | null } | null;
  };
  if (!seller) return null;

  const { count } = (await untypedFrom(db, "scam_reports")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .is("revoked_at", null)) as { count: number | null };

  const ordersDone = seller.orders_done ?? 0;
  const ratingCount = seller.rating_count ?? 0;
  const ratingAvg = ratingCount > 0 ? Math.round(((seller.rating_sum ?? 0) / ratingCount) * 10) / 10 : null;
  const scamFlags = count ?? 0;

  let level: SellerTrust["level"] = "new";
  if (scamFlags > 0) level = "flagged";
  else if (ordersDone >= 20 && (ratingAvg ?? 0) >= 4.5) level = "trusted";
  else if (ordersDone >= 3) level = "ok";

  return { ordersDone, ratingAvg, ratingCount, scamFlags, level };
}

export interface ListingRisk {
  trust: SellerTrust | null;
  /** UID game của chính tin này từng dính một tranh chấp đã xử. */
  uidFlagged: boolean;
}

/**
 * Rủi ro của MỘT tin đăng: uy tín người bán, cộng thêm một lượt tra riêng cho
 * UID game của tin.
 *
 * Vì sao phải tra UID riêng thay vì chỉ nhìn người bán: một acc từng bị tranh
 * chấp hoàn toàn có thể được rao lại dưới tên người bán khác — lúc đó hồ sơ
 * người bán sạch tinh nhưng chính cái acc mới là thứ có vấn đề.
 *
 * UID lấy ra chỉ để tra rồi bỏ, không trả ngược ra ngoài: trang chi tiết tin
 * đi qua shop-privacy nên không được phép cầm UID thật.
 */
export async function getListingRisk(listingId: string, sellerId: string): Promise<ListingRisk> {
  const trust = await getSellerTrust(sellerId);

  const db = createAdminSupabaseClient();
  if (!db) return { trust, uidFlagged: false };

  const { data: listing } = (await untypedFrom(db, "shop_listings")
    .select("game_uid")
    .eq("id", listingId)
    .maybeSingle()) as { data: { game_uid: string | null } | null };

  const uid = listing?.game_uid ? normalizeSubject("uid", listing.game_uid) : null;
  if (!uid) return { trust, uidFlagged: false };

  const { count } = (await untypedFrom(db, "scam_reports")
    .select("id", { count: "exact", head: true })
    .eq("subject_type", "uid")
    .eq("subject_value", uid)
    .is("revoked_at", null)) as { count: number | null };

  return { trust, uidFlagged: (count ?? 0) > 0 };
}
