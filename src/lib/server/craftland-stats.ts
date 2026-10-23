import "server-only";
import {
  getDailyRows, ratingAvg, seriesByDay, tbl, vnDayOffset, viewBreakdown,
} from "@/lib/server/craftland";
import type { CraftlandMap } from "@/lib/types/craftland";

/**
 * Số liệu cho Creator Studio và trang quản trị. Mọi con số ở đây đọc từ bảng
 * sự kiện / tổng hợp ngày do server ghi — không có giá trị dựng sẵn.
 */

export type StatsRange = { from: string; to: string; label: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Khoảng ngày (giờ VN) từ query: ?range=7d|30d|90d hoặc ?from=&to= (tối đa 366 ngày). */
export function parseRange(params: { range?: string; from?: string; to?: string }): StatsRange {
  const today = vnDayOffset(0);
  if (params.from && params.to && ISO_DAY.test(params.from) && ISO_DAY.test(params.to) && params.from <= params.to) {
    const spanDays = (Date.parse(params.to) - Date.parse(params.from)) / 86400_000;
    if (spanDays <= 366 && params.to <= today) {
      return { from: params.from, to: params.to, label: `${params.from} → ${params.to}` };
    }
  }
  const days = params.range === "90d" ? 90 : params.range === "7d" ? 7 : 30;
  return { from: vnDayOffset(days - 1), to: today, label: `${days} ngày gần nhất` };
}

export async function countEventsSince(mapIds: string[], type: string, sinceIso: string): Promise<number> {
  if (mapIds.length === 0) return 0;
  const { count } = (await tbl("craftland_map_events")
    .select("id", { count: "exact", head: true })
    .in("map_id", mapIds)
    .eq("event_type", type)
    .gte("created_at", sinceIso)) as unknown as { count: number | null };
  return count ?? 0;
}

const DIMENSIONS = ["source", "device", "browser", "country", "referrer", "search"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export async function getCreatorAnalytics(userId: string, range: StatsRange, mapId?: string | null) {
  const { data: mapsRaw } = (await tbl("craftland_maps")
    .select("id, slug, title, status, view_count, unique_view_count, copy_count, share_count, guide_open_count, favorite_count, rating_count, rating_sum, published_at")
    .eq("creator_id", userId)
    .limit(500)) as unknown as {
    data: Array<Pick<CraftlandMap,
      "id" | "slug" | "title" | "status" | "view_count" | "unique_view_count" | "copy_count" | "share_count"
      | "guide_open_count" | "favorite_count" | "rating_count" | "rating_sum" | "published_at">> | null;
  };
  const maps = mapsRaw ?? [];
  // Lọc theo một bản đồ chỉ khi bản đồ đó đúng là của creator (chống IDOR).
  const scoped = mapId ? maps.filter((m) => m.id === mapId) : maps;
  const ids = scoped.map((m) => m.id);

  const fromIso = new Date(`${range.from}T00:00:00+07:00`).toISOString();
  const [daily, views24h, breakdowns] = await Promise.all([
    getDailyRows(ids, range.from, range.to),
    countEventsSince(ids, "view", new Date(Date.now() - 86400_000).toISOString()),
    Promise.all(DIMENSIONS.map((d) => viewBreakdown(ids, fromIso, d, 8))),
  ]);

  const series = seriesByDay(daily, range.from, range.to);
  const totals = series.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      unique: acc.unique + d.unique,
      copies: acc.copies + d.copies,
      shares: acc.shares + d.shares,
      guide: acc.guide + d.guide,
      favorites: acc.favorites + d.favorites,
    }),
    { views: 0, unique: 0, copies: 0, shares: 0, guide: 0, favorites: 0 },
  );

  const perMapRange = new Map<string, { views: number; copies: number; guide: number; shares: number; favorites: number }>();
  for (const r of daily) {
    const p = perMapRange.get(r.map_id) ?? { views: 0, copies: 0, guide: 0, shares: 0, favorites: 0 };
    p.views += r.views;
    p.copies += r.copies;
    p.guide += r.guide_opens;
    p.shares += r.shares;
    p.favorites += r.favorites;
    perMapRange.set(r.map_id, p);
  }

  const ranking = scoped
    .map((m) => {
      const p = perMapRange.get(m.id) ?? { views: 0, copies: 0, guide: 0, shares: 0, favorites: 0 };
      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        status: m.status,
        rangeViews: p.views,
        rangeCopies: p.copies,
        rangeGuide: p.guide,
        rangeShares: p.shares,
        conversion: p.views > 0 ? (p.copies + p.guide) / p.views : null,
        totalViews: m.view_count,
        favorites: m.favorite_count,
        rating: m.rating_count > 0 ? ratingAvg(m) : null,
        ratingCount: m.rating_count,
      };
    })
    .sort((a, b) => b.rangeViews - a.rangeViews || b.totalViews - a.totalViews);

  const lifetime = scoped.reduce(
    (acc, m) => ({
      views: acc.views + m.view_count,
      unique: acc.unique + m.unique_view_count,
      copies: acc.copies + m.copy_count,
      shares: acc.shares + m.share_count,
      favorites: acc.favorites + m.favorite_count,
      ratings: acc.ratings + m.rating_count,
      ratingSum: acc.ratingSum + m.rating_sum,
    }),
    { views: 0, unique: 0, copies: 0, shares: 0, favorites: 0, ratings: 0, ratingSum: 0 },
  );

  const statusCounts = maps.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    range,
    maps: maps.map((m) => ({ id: m.id, title: m.title })),
    selectedMapId: scoped.length === 1 && mapId ? mapId : null,
    views24h,
    totals,
    conversion: totals.views > 0 ? (totals.copies + totals.guide) / totals.views : null,
    lifetime,
    statusCounts,
    series,
    ranking,
    breakdown: Object.fromEntries(DIMENSIONS.map((d, i) => [d, breakdowns[i]])) as Record<Dimension, Array<{ key: string; total: number }>>,
  };
}

export type CreatorAnalytics = Awaited<ReturnType<typeof getCreatorAnalytics>>;

/** Tổng quan toàn hệ thống cho /admin/craftland. */
export async function getSystemOverview(range: StatsRange) {
  const head = (table: string) => tbl(table).select("*", { count: "exact", head: true });
  type C = Promise<{ count: number | null }>;

  const [creators, verified, published, pending, openReports, openVerifs, rejections, daily] = await Promise.all([
    head("craftland_creators") as unknown as C,
    head("craftland_creators").eq("verification_status", "verified") as unknown as C,
    head("craftland_maps").eq("status", "published") as unknown as C,
    head("craftland_maps").eq("status", "pending") as unknown as C,
    head("craftland_reports").eq("status", "open") as unknown as C,
    head("craftland_verification_requests").in("status", ["pending", "needs_info"]) as unknown as C,
    tbl("craftland_event_rejections").select("day, reason, count").gte("day", range.from).lte("day", range.to) as unknown as Promise<{
      data: Array<{ day: string; reason: string; count: number }> | null;
    }>,
    tbl("craftland_map_daily").select("map_id, day, views, unique_visitors, copies, shares, guide_opens, favorites")
      .gte("day", range.from).lte("day", range.to).limit(50000) as unknown as Promise<{
      data: Array<{ map_id: string; day: string; views: number; unique_visitors: number; copies: number; shares: number; guide_opens: number; favorites: number }> | null;
    }>,
  ]);

  const series = seriesByDay(daily.data ?? [], range.from, range.to);
  const rejectionByReason = (rejections.data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + r.count;
    return acc;
  }, {});

  // Bản đồ được quan tâm nhất trong khoảng
  const perMap = new Map<string, number>();
  for (const r of daily.data ?? []) perMap.set(r.map_id, (perMap.get(r.map_id) ?? 0) + r.views);
  const topIds = Array.from(perMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const { data: topMaps } = topIds.length
    ? ((await tbl("craftland_maps").select("id, slug, title").in("id", topIds.map(([id]) => id))) as unknown as {
        data: Array<{ id: string; slug: string; title: string }> | null;
      })
    : { data: [] };
  const titleById = new Map((topMaps ?? []).map((m) => [m.id, m]));

  // Từ khoá tìm kiếm phổ biến (từ nguồn "search" của sự kiện xem)
  const fromIso = new Date(`${range.from}T00:00:00+07:00`).toISOString();
  const { data: allIds } = (await tbl("craftland_maps").select("id").eq("status", "published").limit(5000)) as unknown as {
    data: Array<{ id: string }> | null;
  };
  const topSearches = await viewBreakdown((allIds ?? []).map((m) => m.id), fromIso, "search", 15);

  const { count: newCreators } = (await head("craftland_creators").gte("created_at", fromIso)) as unknown as { count: number | null };

  return {
    range,
    counts: {
      creators: creators.count ?? 0,
      verified: verified.count ?? 0,
      newCreators: newCreators ?? 0,
      published: published.count ?? 0,
      pending: pending.count ?? 0,
      openReports: openReports.count ?? 0,
      openVerifications: openVerifs.count ?? 0,
    },
    series,
    totals: series.reduce(
      (acc, d) => ({ views: acc.views + d.views, copies: acc.copies + d.copies, favorites: acc.favorites + d.favorites }),
      { views: 0, copies: 0, favorites: 0 },
    ),
    rejectionByReason,
    topMaps: topIds.map(([id, views]) => ({ id, views, slug: titleById.get(id)?.slug ?? "", title: titleById.get(id)?.title ?? "(đã xoá)" })),
    topSearches,
  };
}

export type SystemOverview = Awaited<ReturnType<typeof getSystemOverview>>;
