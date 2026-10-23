import "server-only";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getAuthContext } from "@/lib/server/auth";
import { getAdminAccess } from "@/lib/server/admin-access";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getClientIp } from "@/lib/server/get-client-ip";
import { MAP_PAGE_SIZE, MAP_PERIODS, type MapPeriodKey, type MapSortKey } from "@/lib/constants/craftland";
import type { CapabilityKey } from "@/lib/permissions";
import type {
  CraftlandCategory,
  CraftlandCreator,
  CraftlandCreatorSummary,
  CraftlandDailyRow,
  CraftlandMap,
  CraftlandMapCard,
} from "@/lib/types/craftland";

/**
 * Lớp dữ liệu Craftland. Mọi truy vấn đi bằng service role, nên MỌI hàm ở đây
 * tự lọc theo trạng thái/chủ sở hữu — đừng trả thẳng hàng của bảng ra client
 * mà không qua các hàm public* hoặc kiểm tra quyền ở route.
 */

export function craftlandDb() {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("Supabase service role chưa được cấu hình.");
  return db;
}

export const tbl = (name: string) => untypedFrom(craftlandDb(), name);

type Rows<T> = { data: T[] | null; error: { message: string } | null; count?: number | null };
type Row<T> = { data: T | null; error: { message: string } | null };

export const CARD_COLUMNS =
  "id, slug, title, summary, category_slug, map_code, cover_url, tags, view_count, favorite_count, rating_count, rating_sum, published_at, is_editor_pick, is_featured, creator_id";

export const CREATOR_SUMMARY_COLUMNS = "user_id, username, display_name, avatar_url, verification_status";

// ── Tiện ích ──────────────────────────────────────────────────

/** "Bản Đồ Sinh Tồn #1" → "ban-do-sinh-ton-1" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Làm sạch text thuần. KHÔNG escape HTML — React tự escape khi render, escape
 * ở đây sẽ hiện nguyên "&amp;" cho người đọc. Chỉ bỏ ký tự điều khiển và
 * khoảng trắng thừa cuối dòng.
 */
export function cleanText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Bỏ ký tự có nghĩa trong cú pháp filter của PostgREST (`,()*%\`). */
export function cleanSearch(q: string | null | undefined): string {
  return (q ?? "").replace(/[,()*%\\"{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function ratingAvg(m: { rating_count: number; rating_sum: number }): number {
  return m.rating_count > 0 ? m.rating_sum / m.rating_count : 0;
}

export function vnDayOffset(daysAgo: number): string {
  return new Date(Date.now() + 7 * 3600_000 - daysAgo * 86400_000).toISOString().slice(0, 10);
}

export function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ── Quyền ─────────────────────────────────────────────────────

export type CraftlandActor = {
  userId: string;
  email: string | null;
  role: string;
  can: (capability: CapabilityKey) => boolean;
};

/** Người đang đăng nhập + hàm kiểm tra capability (null nếu chưa đăng nhập). */
export async function getCraftlandActor(): Promise<CraftlandActor | null> {
  const auth = await getAuthContext();
  if (!auth.userId) return null;
  const access = await getAdminAccess(auth);
  return { userId: auth.userId, email: auth.email, role: auth.role, can: access.can };
}

/**
 * Ghi nhật ký kiểm duyệt append-only (bảng riêng của Craftland) đồng thời đẩy
 * một dòng sang nhật ký hoạt động admin chung để trang /admin/logs thấy được.
 */
export async function logCraftlandAction(input: {
  actor: CraftlandActor;
  targetType: "map" | "creator" | "verification" | "report" | "category" | "academy";
  targetId: string;
  action: string;
  reason?: string | null;
  outcome?: "success" | "failure";
  metadata?: Record<string, unknown>;
  summary: string;
  request?: NextRequest;
  /** false cho thao tác của chính creator — chỉ ghi lịch sử Craftland, không vào nhật ký admin. */
  staffAction?: boolean;
}) {
  const ip = input.request ? getClientIp(input.request) : null;
  const { error } = await tbl("craftland_moderation_actions").insert({
    actor_id: input.actor.userId,
    actor_email: input.actor.email,
    target_type: input.targetType,
    target_id: input.targetId,
    action: input.action,
    reason: input.reason ?? null,
    outcome: input.outcome ?? "success",
    metadata: input.metadata ?? {},
    ip: ip && ip !== "unknown" ? ip : null,
  } as never) as unknown as { error: { message: string } | null };
  if (error) console.warn("[craftland] moderation log failed:", error.message);
  if (input.staffAction === false) return;

  await logAdminActivity({
    action: `CRAFTLAND_${input.action.toUpperCase()}`,
    targetType: `CRAFTLAND_${input.targetType.toUpperCase()}`,
    targetId: input.targetId,
    summary: input.summary,
    actorEmail: input.actor.email,
    request: input.request,
  });
}

// ── Thể loại ──────────────────────────────────────────────────

export async function getCategories(includeInactive = false): Promise<CraftlandCategory[]> {
  try {
    let query = tbl("craftland_categories").select("*").order("sort_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data } = (await query) as unknown as Rows<CraftlandCategory>;
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Creator ───────────────────────────────────────────────────

export async function getCreatorByUserId(userId: string): Promise<CraftlandCreator | null> {
  const { data } = (await tbl("craftland_creators").select("*").eq("user_id", userId).maybeSingle()) as unknown as Row<CraftlandCreator>;
  return data;
}

export async function getPublicCreator(username: string): Promise<CraftlandCreator | null> {
  const { data } = (await tbl("craftland_creators")
    .select("*")
    .eq("username", username.toLowerCase())
    .eq("status", "active")
    .maybeSingle()) as unknown as Row<CraftlandCreator>;
  return data;
}

async function creatorSummaries(ids: string[]): Promise<Map<string, CraftlandCreatorSummary>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  const { data } = (await tbl("craftland_creators")
    .select(CREATOR_SUMMARY_COLUMNS)
    .in("user_id", unique)) as unknown as Rows<CraftlandCreatorSummary>;
  return new Map((data ?? []).map((c) => [c.user_id, c]));
}

export async function toCards(rows: Array<Omit<CraftlandMapCard, "creator"> & { creator_id: string }>): Promise<CraftlandMapCard[]> {
  const creators = await creatorSummaries(rows.map((r) => r.creator_id));
  return rows.map((r) => ({ ...r, creator: creators.get(r.creator_id) ?? null }));
}

export async function getTopCreators(limit = 8): Promise<Array<CraftlandCreatorSummary & { follower_count: number; map_count: number }>> {
  try {
    const { data: maps } = (await tbl("craftland_maps")
      .select("creator_id, view_count")
      .eq("status", "published")
      .limit(5000)) as unknown as Rows<{ creator_id: string; view_count: number }>;
    const stats = new Map<string, { views: number; count: number }>();
    for (const m of maps ?? []) {
      const s = stats.get(m.creator_id) ?? { views: 0, count: 0 };
      s.views += m.view_count;
      s.count += 1;
      stats.set(m.creator_id, s);
    }
    const ranked = Array.from(stats.entries()).sort((a, b) => b[1].views - a[1].views).slice(0, limit);
    if (ranked.length === 0) return [];
    const { data } = (await tbl("craftland_creators")
      .select(`${CREATOR_SUMMARY_COLUMNS}, follower_count`)
      .in("user_id", ranked.map(([id]) => id))
      .eq("status", "active")) as unknown as Rows<CraftlandCreatorSummary & { follower_count: number }>;
    const byId = new Map((data ?? []).map((c) => [c.user_id, c]));
    return ranked
      .map(([id, s]) => {
        const c = byId.get(id);
        return c ? { ...c, map_count: s.count } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  } catch {
    return [];
  }
}

// ── Bản đồ công khai ──────────────────────────────────────────

type FilterBuilder = ReturnType<ReturnType<typeof tbl>["select"]>;

export type MapListQuery = {
  q?: string;
  category?: string;
  sort?: MapSortKey;
  period?: MapPeriodKey;
  platform?: "mobile" | "pc";
  page?: number;
  creatorId?: string;
  pageSize?: number;
};

/** Điểm "được quan tâm": lượt xem 7 ngày gần nhất từ bảng tổng hợp ngày. */
async function recentViewScores(days = 7): Promise<Map<string, number>> {
  const { data } = (await tbl("craftland_map_daily")
    .select("map_id, views, copies, favorites")
    .gte("day", vnDayOffset(days))
    .limit(20000)) as unknown as Rows<Pick<CraftlandDailyRow, "map_id" | "views" | "copies" | "favorites">>;
  const scores = new Map<string, number>();
  for (const r of data ?? []) {
    // Sao chép mã và lưu là tín hiệu quan tâm mạnh hơn một lượt xem.
    scores.set(r.map_id, (scores.get(r.map_id) ?? 0) + r.views + r.copies * 3 + r.favorites * 5);
  }
  return scores;
}

export async function listPublishedMaps(query: MapListQuery): Promise<{ items: CraftlandMapCard[]; total: number }> {
  const pageSize = query.pageSize ?? MAP_PAGE_SIZE;
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const from = (page - 1) * pageSize;

  try {
    // Tìm theo creator cần tra trước danh sách id (khác bảng) — làm xong rồi
    // mới dựng câu lọc. Builder của PostgREST là thenable: await nó là chạy query.
    const term = cleanSearch(query.q);
    let creatorIds: string[] = [];
    if (term) {
      const { data: creators } = (await tbl("craftland_creators")
        .select("user_id")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(50)) as unknown as Rows<{ user_id: string }>;
      creatorIds = (creators ?? []).map((c) => c.user_id);
    }

    const applyFilters = (base: FilterBuilder): FilterBuilder => {
      let q = base.eq("status", "published");
      if (query.category) q = q.eq("category_slug", query.category);
      if (query.creatorId) q = q.eq("creator_id", query.creatorId);
      if (query.platform) q = q.eq("platforms_verified", true).contains("platforms", [query.platform]);
      const days = MAP_PERIODS.find((p) => p.key === query.period)?.days ?? 0;
      if (days > 0) q = q.gte("published_at", new Date(Date.now() - days * 86400_000).toISOString());
      if (query.sort === "featured") q = q.eq("is_featured", true);
      if (query.sort === "editor") q = q.eq("is_editor_pick", true);
      if (term) {
        const ors = [
          `title.ilike.%${term}%`,
          `summary.ilike.%${term}%`,
          `map_code.ilike.%${term}%`,
          `tags.cs.{"${term.toLowerCase()}"}`,
        ];
        if (creatorIds.length) ors.push(`creator_id.in.(${creatorIds.join(",")})`);
        q = q.or(ors.join(","));
      }
      return q;
    };

    if (query.sort === "trending") {
      // Xếp hạng cần điểm 7 ngày (nằm ở bảng khác) → lấy id theo bộ lọc rồi xếp ở đây.
      const [scores, idsRes] = await Promise.all([
        recentViewScores(7),
        applyFilters(tbl("craftland_maps").select("id, view_count, published_at") as unknown as FilterBuilder)
          .limit(1000) as unknown as Promise<Rows<{ id: string; view_count: number; published_at: string | null }>>,
      ]);
      const all = (idsRes.data ?? []).sort(
        (a, b) =>
          (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) ||
          b.view_count - a.view_count ||
          (b.published_at ?? "").localeCompare(a.published_at ?? ""),
      );
      const pageIds = all.slice(from, from + pageSize).map((r) => r.id);
      if (pageIds.length === 0) return { items: [], total: all.length };
      const { data } = (await tbl("craftland_maps").select(CARD_COLUMNS).in("id", pageIds)) as unknown as Rows<
        Omit<CraftlandMapCard, "creator"> & { creator_id: string }
      >;
      const byId = new Map((data ?? []).map((m) => [m.id, m]));
      const ordered = pageIds.map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);
      return { items: await toCards(ordered), total: all.length };
    }

    let q = applyFilters(tbl("craftland_maps").select(CARD_COLUMNS, { count: "exact" }) as unknown as FilterBuilder);
    switch (query.sort) {
      case "popular":
        q = q.order("view_count", { ascending: false });
        break;
      case "saved":
        q = q.order("favorite_count", { ascending: false });
        break;
      case "rating":
        q = q.gt("rating_count", 0).order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
        break;
      case "featured":
        q = q.order("featured_rank", { ascending: true });
        break;
      default:
        break;
    }
    q = q.order("published_at", { ascending: false, nullsFirst: false });

    const { data, count, error } = (await q.range(from, from + pageSize - 1)) as unknown as Rows<
      Omit<CraftlandMapCard, "creator"> & { creator_id: string }
    >;
    if (error) throw new Error(error.message);
    return { items: await toCards(data ?? []), total: count ?? 0 };
  } catch (err) {
    console.warn("[craftland] listPublishedMaps:", err);
    return { items: [], total: 0 };
  }
}

export async function getPublishedMapBySlug(slug: string): Promise<CraftlandMap | null> {
  const { data } = (await tbl("craftland_maps")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()) as unknown as Row<CraftlandMap>;
  return data;
}

export async function getRelatedMaps(map: CraftlandMap, limit = 6): Promise<CraftlandMapCard[]> {
  const [byCreator, byCategory] = await Promise.all([
    tbl("craftland_maps").select(CARD_COLUMNS).eq("status", "published").eq("creator_id", map.creator_id)
      .neq("id", map.id).order("view_count", { ascending: false }).limit(limit) as unknown as Promise<Rows<Omit<CraftlandMapCard, "creator"> & { creator_id: string }>>,
    tbl("craftland_maps").select(CARD_COLUMNS).eq("status", "published").eq("category_slug", map.category_slug)
      .neq("id", map.id).neq("creator_id", map.creator_id).order("view_count", { ascending: false }).limit(limit) as unknown as Promise<Rows<Omit<CraftlandMapCard, "creator"> & { creator_id: string }>>,
  ]);
  const merged = [...(byCreator.data ?? []), ...(byCategory.data ?? [])].slice(0, limit);
  return toCards(merged);
}

export async function getHubData() {
  const [featured, newest, trending, editorPicks, creators, categories] = await Promise.all([
    listPublishedMaps({ sort: "featured", pageSize: 6 }),
    listPublishedMaps({ sort: "newest", pageSize: 8 }),
    listPublishedMaps({ sort: "trending", pageSize: 8 }),
    listPublishedMaps({ sort: "editor", pageSize: 4 }),
    getTopCreators(8),
    getCategories(),
  ]);
  return {
    featured: featured.items,
    newest: newest.items,
    trending: trending.items,
    editorPicks: editorPicks.items,
    creators,
    categories,
    totalMaps: newest.total,
  };
}

// ── Số liệu creator ───────────────────────────────────────────

export async function getDailyRows(mapIds: string[], fromDay: string, toDay?: string): Promise<CraftlandDailyRow[]> {
  if (mapIds.length === 0) return [];
  let q = tbl("craftland_map_daily").select("*").in("map_id", mapIds).gte("day", fromDay);
  if (toDay) q = q.lte("day", toDay);
  const { data } = (await q.order("day", { ascending: true }).limit(20000)) as unknown as Rows<CraftlandDailyRow>;
  return data ?? [];
}

/** Gộp các dòng ngày của nhiều bản đồ thành chuỗi theo ngày, điền 0 cho ngày trống. */
export function seriesByDay(rows: CraftlandDailyRow[], fromDay: string, toDay: string) {
  const byDay = new Map<string, { views: number; unique: number; copies: number; shares: number; guide: number; favorites: number }>();
  for (let d = new Date(`${fromDay}T00:00:00Z`); d.toISOString().slice(0, 10) <= toDay; d.setUTCDate(d.getUTCDate() + 1)) {
    byDay.set(d.toISOString().slice(0, 10), { views: 0, unique: 0, copies: 0, shares: 0, guide: 0, favorites: 0 });
  }
  for (const r of rows) {
    const b = byDay.get(r.day);
    if (!b) continue;
    b.views += r.views;
    b.unique += r.unique_visitors;
    b.copies += r.copies;
    b.shares += r.shares;
    b.guide += r.guide_opens;
    b.favorites += r.favorites;
  }
  return Array.from(byDay.entries()).map(([day, v]) => ({ day, ...v }));
}

export async function viewBreakdown(mapIds: string[], fromIso: string, dimension: string, limit = 8) {
  if (mapIds.length === 0) return [] as Array<{ key: string; total: number }>;
  const db = craftlandDb();
  const { data } = await (db.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: Array<{ key: string; total: number }> | null }>)("craftland_view_breakdown", {
    p_map_ids: mapIds,
    p_from: fromIso,
    p_dimension: dimension,
    p_limit: limit,
  });
  return (data ?? []).map((r) => ({ key: r.key, total: Number(r.total) }));
}

/**
 * Chốt cho từng trang Creator Studio. Phải gọi trong page — layout và page
 * render song song nên redirect ở layout không chặn được dữ liệu của page.
 */
export async function requireStudioUser(options?: { needProfile?: boolean }) {
  const auth = await getAuthContext();
  if (!auth.userId) redirect("/auth/login?next=/creator");
  const creator = await getCreatorByUserId(auth.userId!).catch(() => null);
  if (options?.needProfile && !creator) redirect("/creator/profile");
  return { userId: auth.userId!, creator };
}
