// Cửa hàng Prime trong game — dữ liệu LIVE lấy từ API cộng đồng,
// khác với gói Prime của Arex ở constants/store.ts (do admin tự nhập).
// Hàm thuần (dùng được cả client lẫn server).

export const PRIME_STORE_API = "https://kog-primestore.vercel.app/get_prime_store";

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
  /** Có thể tặng (nằm trong mục quà tặng). */
  giftable?: boolean;
  /** Được game gắn nhãn "đề xuất". */
  recommended?: boolean;
  /** Nhãn từ kho vật phẩm nội bộ, nếu có. */
  label?: string | null;
};

export type PrimeStoreWindow = {
  storeId: number;
  /** Mốc thời gian (ms) — đã đổi từ giây của API. */
  startAt: number;
  endAt: number;
  /** Cấp tối thiểu để tặng / nhận quà. */
  giverLevel: number;
  receiverLevel: number;
};

/** Vật phẩm đang bán ở server khác nhưng chưa về server đang xem. */
export type PrimePrediction = PrimeLiveItem & {
  /** Các server đã có vật phẩm này. */
  servers: PrimeServer[];
};

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

function parseItem(raw: unknown, giftable: boolean): PrimeLiveItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as RawRecord;
  const itemId = String(o.itemId ?? "");
  // Chỉ nhận ID số — cũng chính là tên file icon, chặn luôn path lạ.
  if (!/^\d{1,20}$/.test(itemId)) return null;
  return {
    itemId,
    gems: num(o.gemsPrice),
    sort: num(o.sortId),
    amount: Math.max(1, num(o.awardNum)),
    ...(giftable ? { giftable: true } : {}),
    ...(typeof o.tagKey === "string" && o.tagKey ? { recommended: true } : {}),
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
        giverLevel: num(desc.giverLevel),
        receiverLevel: num(desc.receiverLevel),
      }
    : null;

  // Gộp hàng thường + hàng tặng, khử trùng theo itemId (giữ giá thấp hơn).
  const byId = new Map<string, PrimeLiveItem>();
  const push = (list: unknown, giftable: boolean) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      const item = parseItem(entry, giftable);
      if (!item) continue;
      const prev = byId.get(item.itemId);
      if (!prev) {
        byId.set(item.itemId, item);
        continue;
      }
      byId.set(item.itemId, {
        ...prev,
        gems: Math.min(prev.gems || item.gems, item.gems || prev.gems),
        giftable: prev.giftable || item.giftable,
        recommended: prev.recommended || item.recommended,
      });
    }
  };
  push(o.primeStoreItems, false);
  push(o.primeGiftStoreItems, true);

  const items = [...byId.values()].sort((a, b) => a.sort - b.sort);
  return { window, items };
}

/** Link icon vật phẩm — đi qua proxy nội bộ (cache edge). */
export const primeItemIcon = (itemId: string) => `/api/ff-icon/${itemId}.png`;
