// Cửa hàng Prime trong game — dữ liệu LIVE lấy từ API cộng đồng,
// khác với gói Prime của Arex ở constants/store.ts (do admin tự nhập).
// Hàm thuần (dùng được cả client lẫn server).

/**
 * Nguồn cửa hàng Prime LIVE.
 *
 * Bản cũ `kog-primestore.vercel.app/get_prime_store` đã bị gỡ (Vercel trả 404
 * "deployment could not be found") nên trang im lặng trắng trơn — `fetchServer`
 * nuốt lỗi rồi trả mảng rỗng. Endpoint mới nằm chung KOG API Gateway với
 * wishlist, payload y hệt (`primeStoreDesc` / `primeStoreItems` /
 * `primeGiftStoreItems`) và vẫn nhận `?server=`.
 *
 * Gateway chặn theo Origin, và đổi URL được qua env — cả hai nằm ở
 * `server/prime-store-live.ts` (file này client cũng nạp nên không đọc env).
 */
export const PRIME_STORE_API = "https://kog-api-gateway.vercel.app/api/primestore/store";

/** Server không truyền param = server mặc định của API. */
export const PRIME_SERVERS = [
  "VN", "SG", "ID", "TH", "TW", "IND", "PK", "BD",
  "BR", "SAC", "NA", "US", "EU", "CIS", "ME",
] as const;

export type PrimeServer = (typeof PRIME_SERVERS)[number];

export const SERVER_LABEL: Record<PrimeServer, string> = {
  VN: "Việt Nam", SG: "Singapore", ID: "Indonesia", TH: "Thái Lan", TW: "Đài Loan",
  IND: "Ấn Độ", PK: "Pakistan", BD: "Bangladesh", BR: "Brazil", SAC: "Nam Mỹ",
  NA: "Bắc Mỹ", US: "Mỹ", EU: "Châu Âu", CIS: "SNG", ME: "Trung Đông",
};

export const isPrimeServer = (v: unknown): v is PrimeServer =>
  typeof v === "string" && (PRIME_SERVERS as readonly string[]).includes(v);

export const DEFAULT_PRIME_SERVER: PrimeServer = "VN";

export type PrimeLiveItem = {
  /** ID vật phẩm Free Fire — cũng là tên file icon. */
  itemId: string;
  /** Giá kim cương. */
  gems: number;
  /** Thứ tự hiển thị trong game. */
  sort: number;
  /** Số lượng nhận. */
  amount: number;
  /** Được game gắn nhãn "đề xuất" — xem ghi chú khử nhiễu ở `parsePrimeStorePayload`. */
  recommended?: boolean;
  /** Nhãn từ kho vật phẩm nội bộ, nếu có. */
  label?: string | null;
};

export type PrimeStoreWindow = {
  storeId: number;
  /** Mốc thời gian (ms) — đã đổi từ giây của API. */
  startAt: number;
  endAt: number;
};

/** Vật phẩm đang bán ở server khác nhưng chưa về server đang xem. */
export type PrimePrediction = PrimeLiveItem & {
  /** Các server đã có vật phẩm này. */
  servers: PrimeServer[];
  /** Số server có dữ liệu để đối chiếu (mẫu) — server đóng cửa hàng không tính. */
  sampleSize: number;
  /** Các server đã sang đợt mới mà có món này — tín hiệu mạnh nhất. */
  aheadServers: PrimeServer[];
  /** Độ tin cậy 0..1, xem `PREDICTION_LEVELS` để đổi ra nhãn. */
  confidence: number;
};

/**
 * Ngưỡng → nhãn *độ mạnh tín hiệu* (giảm dần, lấy ngưỡng khớp đầu tiên).
 *
 * Cố tình không gọi là "xác suất": cửa hàng các khu vực lệch nhau khá nhiều nên
 * điểm cao nhất trong thực tế chỉ quanh 0.3 — hứa "70% chắc về" là nói điêu.
 * Ngưỡng dưới đây hiệu chỉnh theo phân bố thật để việc xếp hạng có ý nghĩa.
 */
export const PREDICTION_LEVELS = [
  { min: 0.28, label: "Tín hiệu mạnh" },
  { min: 0.15, label: "Tín hiệu vừa" },
  { min: 0, label: "Tín hiệu yếu" },
] as const;

export const predictionLevel = (confidence: number) =>
  PREDICTION_LEVELS.find((l) => confidence >= l.min) ?? PREDICTION_LEVELS[PREDICTION_LEVELS.length - 1];

export type PrimeStoreLive = {
  server: PrimeServer;
  window: PrimeStoreWindow | null;
  items: PrimeLiveItem[];
  predictions: PrimePrediction[];
  /** Thời điểm dữ liệu được lấy (ms) — để hiện "cập nhật lúc". */
  fetchedAt: number;
};

// ── Chuẩn hoá payload thô của API ───────────────────────────────────────────

type RawRecord = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** API trả timestamp dạng chuỗi giây. */
const toMs = (v: unknown): number => num(v) * 1000;

/** ID vật phẩm cũng là tên file icon — chỉ nhận số, chặn luôn path lạ. */
const asItemId = (v: unknown): string | null => {
  const id = String(v ?? "");
  return /^\d{1,20}$/.test(id) ? id : null;
};

function parseItem(raw: unknown): (PrimeLiveItem & { tagKey: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as RawRecord;
  const itemId = asItemId(o.itemId);
  if (!itemId) return null;

  return {
    itemId,
    gems: num(o.gemsPrice),
    sort: num(o.sortId),
    amount: Math.max(1, num(o.awardNum)),
    tagKey: typeof o.tagKey === "string" ? o.tagKey : "",
  };
}

export function parsePrimeStorePayload(raw: unknown): {
  window: PrimeStoreWindow | null;
  items: PrimeLiveItem[];
} {
  if (!raw || typeof raw !== "object") return { window: null, items: [] };
  const o = raw as RawRecord;

  const desc = o.primeStoreDesc as RawRecord | undefined;
  const window: PrimeStoreWindow | null = desc
    ? {
        storeId: num(desc.storeId),
        startAt: toMs(desc.startTimestamp),
        endAt: toMs(desc.endTimestamp),
      }
    : null;

  // Gộp hàng thường + mục quà tặng rồi khử trùng theo itemId (giữ giá thấp hơn).
  // Vẫn đọc cả hai danh sách vì có server bày món chỉ nằm ở mục quà tặng — trang
  // không hiện chuyện tặng nữa, nhưng bỏ nguồn này thì thiếu hàng.
  type Parsed = PrimeLiveItem & { tagKey: string };
  const byId = new Map<string, Parsed>();
  const push = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      const item = parseItem(entry);
      if (!item) continue;
      const prev = byId.get(item.itemId);
      if (!prev) {
        byId.set(item.itemId, item);
        continue;
      }
      byId.set(item.itemId, {
        ...prev,
        gems: Math.min(prev.gems || item.gems, item.gems || prev.gems),
        tagKey: prev.tagKey || item.tagKey,
      });
    }
  };
  push(o.primeStoreItems);
  push(o.primeGiftStoreItems);

  const parsed = [...byId.values()].sort((a, b) => a.sort - b.sort);

  // Game gắn cùng một `tagKey` cho *mọi* món trong đợt, nên gắn nhãn "đề xuất"
  // cho tất cả thì chẳng đề xuất gì cả — chỉ giữ khi nó tách được một nhóm nhỏ.
  const tagged = parsed.filter((i) => i.tagKey).length;
  const meaningful = tagged > 0 && tagged < parsed.length;

  const items = parsed.map(({ tagKey, ...item }) => ({
    ...item,
    ...(meaningful && tagKey ? { recommended: true } : {}),
  }));
  return { window, items };
}

/** Link icon vật phẩm — đi qua proxy nội bộ (cache edge). */
export const primeItemIcon = (itemId: string) => `/api/ff-icon/${itemId}.png`;
