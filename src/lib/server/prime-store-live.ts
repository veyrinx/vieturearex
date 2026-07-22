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

type ServerStore = { window: PrimeStoreWindow | null; items: PrimeLiveItem[] };

async function fetchServer(server: PrimeServer): Promise<ServerStore> {
  const url = `${PRIME_STORE_API}?server=${encodeURIComponent(server)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["prime-store-live"] },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { window: null, items: [] };
    return parsePrimeStorePayload(await res.json());
  } catch {
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

const MAX_PREDICTIONS = 12;

/**
 * Cửa hàng Prime của một server + phần "dự đoán".
 *
 * Dự đoán không phải phỏng đoán khơi khơi: các server chạy lệch đợt nhau, nên
 * vật phẩm đang bán ở server khác mà server đang xem chưa có thì khả năng cao
 * là hàng sắp về. Càng nhiều server đã có thì càng nhiều khả năng.
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

  // itemId → các server đang bán (chỉ tính server chưa có ở đây).
  const elsewhere = new Map<string, { item: PrimeLiveItem; servers: PrimeServer[] }>();
  rest.forEach((store, idx) => {
    const from = others[idx];
    for (const item of store.items) {
      if (owned.has(item.itemId)) continue;
      const found = elsewhere.get(item.itemId);
      if (found) found.servers.push(from);
      else elsewhere.set(item.itemId, { item, servers: [from] });
    }
  });

  const predictions: PrimePrediction[] = [...elsewhere.values()]
    .sort((a, b) => b.servers.length - a.servers.length || a.item.gems - b.item.gems)
    .slice(0, MAX_PREDICTIONS)
    .map(({ item, servers }) => ({ ...item, servers }));

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
