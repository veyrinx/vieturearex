import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  DEFAULT_PRIME_SERVER,
  PRIME_SERVERS,
  PRIME_STORE_API,
  parsePrimeStorePayload,
  type PrimeLiveItem,
  type PrimePrediction,
  type PrimeServer,
  type PrimeStoreLive,
  type PrimeStoreWindow,
} from "@/lib/constants/prime-store-live";

/** Cửa hàng đổi theo tuần nên cache 30 phút là thoải mái. */
const REVALIDATE_SECONDS = 1_800;
const FETCH_TIMEOUT_MS = 8_000;

/** Đổi được mà không phải build lại, phòng khi gateway dời chỗ lần nữa. */
const API_URL = process.env.PRIME_STORE_API_URL || PRIME_STORE_API;

/**
 * Gateway chỉ mở cho đúng một Origin (frontend FFWM trên GitHub Pages) — gọi từ
 * máy chủ vốn không có Origin nên ăn 403. Dùng chung biến với wishlist vì cùng
 * một gateway, xem `lib/server/ff-wishlist.ts`.
 */
const GATEWAY_ORIGIN = process.env.WISHLIST_API_ORIGIN || "https://kingofgames02.github.io";
const REQUEST_HEADERS = {
  Accept: "application/json",
  Origin: GATEWAY_ORIGIN,
  Referer: `${GATEWAY_ORIGIN}/FFWM-app/`,
} as const;

type ServerStore = { window: PrimeStoreWindow | null; items: PrimeLiveItem[] };

async function fetchServer(server: PrimeServer): Promise<ServerStore> {
  const url = `${API_URL}?server=${encodeURIComponent(server)}`;
  try {
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      next: { revalidate: REVALIDATE_SECONDS, tags: ["prime-store-live"] },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      // Nguồn chết thì trang chỉ trắng trơn, không có dấu vết nào — log để còn biết.
      console.error(`[prime-store] ${server} → HTTP ${res.status}`);
      return { window: null, items: [] };
    }
    return parsePrimeStorePayload(await res.json());
  } catch (err) {
    console.error(`[prime-store] ${server} →`, err instanceof Error ? err.message : err);
    return { window: null, items: [] };
  }
}

/** Nhãn vật phẩm từ kho nội bộ — tra 1 lần cho cả danh sách. */
async function labelMap(itemIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (itemIds.length === 0) return out;
  try {
    const db = createAdminSupabaseClient();
    if (!db) return out;
    const { data } = (await untypedFrom(db, "ff_items_catalog")
      .select("id, label, is_public")
      .in("id", itemIds)) as { data: { id: string; label: string | null; is_public: boolean }[] | null };
    for (const row of data ?? []) {
      if (row.is_public && row.label) out.set(row.id, row.label);
    }
  } catch { /* kho nội bộ chỉ là phần thêm — thiếu thì thôi */ }
  return out;
}

/**
 * Đợt sau bày cỡ bằng đợt này, nên chỉ dự đoán chừng đó + chút dư.
 * Đổ hết mọi món các server khác đang bán ra thì không phải dự đoán, chỉ là
 * chép lại API — càng dài càng chắc trúng, mà trúng kiểu đó thì vô nghĩa.
 */
const PREDICTION_SLACK = 2;
const MIN_PREDICTIONS = 4;
const MAX_PREDICTIONS = 10;

/** Dưới ngưỡng này là nhiễu — thà hiện ít còn hơn hiện bừa. */
const MIN_CONFIDENCE = 0.15;

/** Lệch giờ nhỏ giữa các server không tính là "đã sang đợt mới". */
const AHEAD_TOLERANCE_MS = 3_600_000;

/** Trọng số điểm tin cậy — cộng lại đúng 1 khi có mẫu "server đi trước". */
const W_AHEAD = 0.5;
const W_COVERAGE_WITH_AHEAD = 0.45;
const W_RECOMMENDED = 0.05;
/** Không có server nào đi trước thì chỉ suy từ độ phủ — chặn trần cho khiêm tốn. */
const NO_AHEAD_CAP = 0.9;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Cửa hàng Prime của một server + phần "dự đoán".
 *
 * Dự đoán không phải phỏng đoán khơi khơi: các server chạy lệch đợt nhau, nên
 * vật phẩm đang bán ở server khác mà server đang xem chưa có thì khả năng cao
 * là hàng sắp về. Hai tín hiệu được chấm điểm:
 *
 * 1. Server "đi trước" — đợt hiện tại của họ mở sau đợt của server đang xem,
 *    tức là họ đang bán đúng cái mình sắp nhận. Đây là tín hiệu mạnh nhất.
 * 2. Độ phủ — bao nhiêu phần trăm server *có dữ liệu* đang bán món đó. Mẫu số
 *    chỉ đếm server thật sự mở cửa hàng, để server lỗi/đóng không kéo tỉ lệ xuống.
 */
export async function getPrimeStoreLive(
  server: PrimeServer = DEFAULT_PRIME_SERVER,
): Promise<PrimeStoreLive> {
  const others = PRIME_SERVERS.filter((s) => s !== server);
  const [current, ...rest] = await Promise.all([
    fetchServer(server),
    ...others.map((s) => fetchServer(s)),
  ]);

  const owned = new Set(current.items.map((i) => i.itemId));

  // Chỉ đối chiếu với server thật sự có hàng — server lỗi hoặc đóng cửa hàng
  // không xác nhận cũng không phủ nhận được gì.
  const usable = rest
    .map((store, idx) => ({ store, from: others[idx] }))
    .filter(({ store }) => store.items.length > 0);

  const startAt = current.window?.startAt ?? 0;
  const isAhead = ({ store }: (typeof usable)[number]) =>
    startAt > 0 && store.window != null && store.window.startAt > startAt + AHEAD_TOLERANCE_MS;

  const sampleSize = usable.length;
  const aheadSample = usable.filter(isAhead).length;

  // itemId → các server đang bán (chỉ tính món server đang xem chưa có).
  type Bucket = { item: PrimeLiveItem; servers: PrimeServer[]; aheadServers: PrimeServer[] };
  const elsewhere = new Map<string, Bucket>();
  for (const entry of usable) {
    const ahead = isAhead(entry);
    for (const item of entry.store.items) {
      if (owned.has(item.itemId)) continue;
      let bucket = elsewhere.get(item.itemId);
      if (!bucket) {
        bucket = { item, servers: [], aheadServers: [] };
        elsewhere.set(item.itemId, bucket);
      }
      bucket.servers.push(entry.from);
      if (ahead) bucket.aheadServers.push(entry.from);
      // Món được gắn "đề xuất" ở bất kỳ server nào thì giữ cờ đó.
      if (item.recommended) bucket.item = { ...bucket.item, recommended: true };
    }
  }

  const score = ({ item, servers, aheadServers }: Bucket) => {
    const coverage = sampleSize > 0 ? servers.length / sampleSize : 0;
    const bonus = item.recommended ? W_RECOMMENDED : 0;
    if (aheadSample === 0) return clamp01(coverage * NO_AHEAD_CAP + bonus);
    return clamp01(
      (aheadServers.length / aheadSample) * W_AHEAD + coverage * W_COVERAGE_WITH_AHEAD + bonus,
    );
  };

  const limit = Math.max(
    MIN_PREDICTIONS,
    Math.min(MAX_PREDICTIONS, current.items.length + PREDICTION_SLACK),
  );

  const predictions: PrimePrediction[] = [...elsewhere.values()]
    .map((b) => ({ bucket: b, confidence: score(b) }))
    .filter(({ confidence }) => confidence >= MIN_CONFIDENCE)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.bucket.servers.length - a.bucket.servers.length ||
        a.bucket.item.gems - b.bucket.item.gems,
    )
    .slice(0, limit)
    .map(({ bucket, confidence }) => ({
      ...bucket.item,
      servers: bucket.servers,
      aheadServers: bucket.aheadServers,
      sampleSize,
      confidence,
    }));

  const labels = await labelMap([
    ...current.items.map((i) => i.itemId),
    ...predictions.map((i) => i.itemId),
  ]);
  const withLabel = <T extends PrimeLiveItem>(i: T): T => ({ ...i, label: labels.get(i.itemId) ?? null });

  return {
    server,
    window: current.window,
    items: current.items.map(withLabel),
    predictions: predictions.map(withLabel),
    fetchedAt: Date.now(),
  };
}
