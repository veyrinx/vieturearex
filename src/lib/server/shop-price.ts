import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getPlayerAllData, isFfApiConfigured, normalizePlayerUid } from "@/lib/server/ff-api";
import type { ListingKind } from "@/lib/constants/shop";

/**
 * Lịch sử giá chợ Arex → định giá acc từ số liệu thật.
 *
 * Mỗi đơn hoàn tất ghi lại một dòng: giá người mua THẬT SỰ trả, giá rao ban
 * đầu, và chỉ số acc lấy từ API Free Fire tại thời điểm chốt. Chỉ số lấy từ API
 * chứ không lấy từ `shop_listings.details` vì `details` là các cặp khoá/giá trị
 * người bán tự gõ — không có schema, không đối chiếu được giữa các tin.
 *
 * Nhờ vậy "acc tương tự" nghĩa là cùng hạng level và điểm rank thật, chứ không
 * phải cùng lời quảng cáo.
 */

/** Khoảng level coi là "tương tự" (±15%). */
const LEVEL_TOLERANCE = 0.15;

/** Dưới ngần này mẫu thì khoảng giá vô nghĩa — nới điều kiện rồi nói rõ cơ sở. */
const MIN_SAMPLE = 5;

/** Chỉ tính giá trong vòng 1 năm: giá acc FF trượt nhanh theo mùa OB. */
const WINDOW_DAYS = 365;

export interface PriceStats {
  /** Số đơn dùng để tính. 0 = chưa đủ dữ liệu, UI phải ẩn khối gợi ý giá. */
  sample: number;
  /** 'similar' = lọc theo level/rank. 'kind' = chỉ theo loại. 'none' = không đủ. */
  basis: "similar" | "kind" | "none";
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  /**
   * Mức mặc cả trung bình: giá chốt thấp hơn giá rao bao nhiêu phần trăm.
   * null khi không đủ đơn có giá rao.
   */
  avgDiscountPercent: number | null;
}

interface HistoryRow {
  price: number;
  listed_price: number | null;
  level: number | null;
  br_rank_point: number | null;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function summarize(rows: HistoryRow[], basis: PriceStats["basis"]): PriceStats {
  const prices = rows.map((r) => r.price).sort((a, b) => a - b);
  const withListed = rows.filter((r) => r.listed_price && r.listed_price > 0);
  const avgDiscount = withListed.length
    ? Math.round(
        (withListed.reduce((s, r) => s + (1 - r.price / (r.listed_price as number)), 0) /
          withListed.length) *
          1000,
      ) / 10
    : null;

  return {
    sample: rows.length,
    basis,
    median: percentile(prices, 0.5),
    p25: percentile(prices, 0.25),
    p75: percentile(prices, 0.75),
    min: prices[0] ?? null,
    max: prices[prices.length - 1] ?? null,
    avgDiscountPercent: avgDiscount,
  };
}

const EMPTY: PriceStats = {
  sample: 0,
  basis: "none",
  median: null,
  p25: null,
  p75: null,
  min: null,
  max: null,
  avgDiscountPercent: null,
};

/**
 * Khoảng giá của những acc tương tự.
 *
 * Thiếu level thì rơi thẳng về thống kê theo loại — vẫn hữu ích hơn là không
 * hiện gì, miễn là `basis` nói rõ con số đến từ đâu.
 */
export async function getPriceStats(filter: {
  kind?: ListingKind;
  level?: number | null;
  brRankPoint?: number | null;
}): Promise<PriceStats> {
  const db = createAdminSupabaseClient();
  if (!db) return EMPTY;

  const kind: ListingKind = filter.kind ?? "account";
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const { data, error } = (await untypedFrom(db, "shop_price_history")
    .select("price, listed_price, level, br_rank_point")
    .eq("kind", kind)
    .gte("sold_at", since)) as { data: HistoryRow[] | null; error: unknown };

  if (error || !data?.length) return EMPTY;

  const level = filter.level ?? null;
  if (level && level > 0) {
    const lo = level * (1 - LEVEL_TOLERANCE);
    const hi = level * (1 + LEVEL_TOLERANCE);
    const similar = data.filter((r) => r.level !== null && r.level >= lo && r.level <= hi);
    if (similar.length >= MIN_SAMPLE) return summarize(similar, "similar");
  }

  if (data.length >= MIN_SAMPLE) return summarize(data, "kind");
  return EMPTY;
}

/**
 * Ghi một đơn đã chốt vào lịch sử giá. Gọi ngay sau khi đơn chuyển sang
 * `completed`. Nuốt mọi lỗi: hỏng thống kê không được phép làm hỏng luồng đơn.
 *
 * `order_id` là UNIQUE nên gọi lại cùng một đơn không sinh dòng trùng.
 */
export async function recordSoldPrice(orderId: string): Promise<void> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return;

    const { data: order } = (await untypedFrom(db, "shop_orders")
      .select("id, listing_id, amount")
      .eq("id", orderId)
      .maybeSingle()) as { data: { id: string; listing_id: string; amount: number } | null };
    if (!order) return;

    const { data: listing } = (await untypedFrom(db, "shop_listings")
      .select("id, kind, price, game_uid, details")
      .eq("id", order.listing_id)
      .maybeSingle()) as {
      data: {
        id: string;
        kind: string;
        price: number;
        game_uid: string | null;
        details: Record<string, unknown> | null;
      } | null;
    };

    const gameUid = listing?.game_uid ? normalizePlayerUid(listing.game_uid) : null;
    const stats = gameUid ? await fetchAccountStats(gameUid) : null;

    await untypedFrom(db, "shop_price_history").upsert(
      {
        order_id: order.id,
        listing_id: listing?.id ?? null,
        kind: listing?.kind ?? "account",
        price: order.amount,
        listed_price: listing?.price ?? null,
        game_uid: gameUid,
        level: stats?.level ?? null,
        likes: stats?.likes ?? null,
        br_rank_point: stats?.brRankPoint ?? null,
        cs_rank_point: stats?.csRankPoint ?? null,
        details: listing?.details ?? {},
      } as never,
      { onConflict: "order_id" },
    );
  } catch {
    // im lặng — thống kê không được chặn luồng đơn
  }
}

async function fetchAccountStats(uid: string) {
  if (!isFfApiConfigured()) return null;
  const res = await getPlayerAllData(uid).catch(() => null);
  const a = res?.result?.AccountInfo as Record<string, unknown> | undefined;
  if (!a) return null;
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    level: num(a.AccountLevel),
    likes: num(a.AccountLikes),
    brRankPoint: num(a.BrRankPoint),
    csRankPoint: num(a.CsRankPoint),
  };
}
