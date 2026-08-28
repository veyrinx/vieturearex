import "server-only";

import { cache } from "react";
import { decryptSetting, encryptSetting, isSensitiveKey } from "@/lib/server/setting-crypto";
import { createClient } from "@supabase/supabase-js";
import { compareDesc } from "date-fns";
import { getDemoStore } from "@/lib/server/demo-store";
import {
  hasSupabaseEnv,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type {
  ActiveAdminItem,
  AdminActivityLogItem,
  DashboardStats,
  EventItem,
  EventStatus,
  GalleryItem,
  InvitedEmailItem,
  NewsItem,
  PublicUserProfile,
  SiteSetting,
  UserItem,
  UserRole,
} from "@/lib/types/content";
import { getEventStatusInVietnam } from "@/lib/utils/vietnam-time";
import { normalizeBadges } from "@/lib/constants/user-badges";
import { normalizeDuties } from "@/lib/constants/team-duties";

type EventQuery = {
  search?: string;
  status?: EventStatus | "all";
  /** Key server ("vn", "sea"…) hoặc "all". Sự kiện chưa gán server không khớp key nào. */
  server?: string;
};

const SAMPLE_EVENT_TEXT_PATTERN = /Sample timeline event\s*\([^)]*\)\s*using provided FF image\.?/i;
const DEFAULT_SUPABASE_QUERY_TIMEOUT_MS = 8_000;
const INVITED_EMAILS_SETTING_KEY = "security.invited_emails";
const ACTIVE_ADMIN_WINDOW_MS = 90_000;
const INVITED_EMAIL_EXPIRATION_MS = 48 * 60 * 60 * 1000;
const ADMIN_ACTIVITY_RETENTION_MS = 48 * 60 * 60 * 1000;
let supabaseReadClient: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseQueryTimeoutMs() {
  const parsed = Number.parseInt(process.env.SUPABASE_QUERY_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return DEFAULT_SUPABASE_QUERY_TIMEOUT_MS;
  }
  return parsed;
}

async function withSupabaseReadFallback<T>(
  label: string,
  fallback: () => T | Promise<T>,
  operation: () => Promise<T>,
) {
  if (!hasSupabaseEnv) {
    return fallback();
  }

  // Timer phải được dọn trong finally. Nếu để treo, Fluid Compute vẫn tính tiền
  // provisioned memory cho tới khi timer nổ (mặc định 8s) SAU KHI request xong —
  // mỗi lần đọc dữ liệu lại giữ máy sống thêm 8 giây vô ích.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutMs = getSupabaseQueryTimeoutMs();
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Supabase read timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[content-service] ${label} fallback activated: ${message}`);
    return fallback();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeEventStatus(event: EventItem): EventStatus {
  return getEventStatusInVietnam(event.start_date, event.end_date);
}

function applyEventQuery(events: EventItem[], query?: EventQuery) {
  return events
    .map((event) => ({
      ...event,
      description: event.description.replace(SAMPLE_EVENT_TEXT_PATTERN, "").trim(),
      status: normalizeEventStatus(event),
    }))
    .filter((event) => {
      const search = query?.search?.trim().toLowerCase();
      const matchSearch = search
        ? `${event.title} ${event.description}`.toLowerCase().includes(search)
        : true;
      const matchStatus =
        !query?.status || query.status === "all" ? true : event.status === query.status;
      const server = query?.server?.trim().toLowerCase();
      const matchServer =
        !server || server === "all" ? true : (event.server_region ?? "").toLowerCase() === server;
      return matchSearch && matchStatus && matchServer;
    })
    .sort((a, b) => compareDesc(new Date(a.start_date), new Date(b.start_date)));
}

function applyNewsVisibility(news: NewsItem[], status: "all" | "published" | "draft") {
  if (status === "all") {
    return news;
  }
  return news.filter((item) => item.status === status);
}

function getSupabaseOrThrow() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client not available.");
  }
  return supabase;
}

function getSupabaseAdminOrThrow() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase admin client not available.");
  }
  return supabase;
}

function getSupabaseReadClientOrThrow() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase read client not available.");
  }

  if (!supabaseReadClient) {
    supabaseReadClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseReadClient;
}

/**
 * Giữ nguyên key role miễn là hợp lệ về mặt hình thức — role tuỳ biến tạo ở
 * /admin/settings → Phân quyền không nằm trong danh sách builtin nhưng vẫn phải
 * đọc ra đúng, nếu không user bị tụt về "user" mỗi lần load.
 */
function normalizeRole(raw: unknown): UserRole {
  return typeof raw === "string" && /^[a-z0-9_]{1,32}$/.test(raw) ? (raw as UserRole) : "user";
}

function normalizeUserItem(row: Partial<UserItem>): UserItem {
  const views = Number(row.views ?? 0);
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    display_name: row.display_name ?? null,
    role: normalizeRole(row.role),
    badges: normalizeBadges((row as { badges?: unknown }).badges),
    views: Number.isFinite(views) ? views : 0,
    is_banned: Boolean(row.is_banned),
    is_verified: row.is_verified === true,
    avatar_url: row.avatar_url ?? null,
    bio: (row as { bio?: string | null }).bio ?? null,
    phone: (row as { phone?: string | null }).phone ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapEventRow(row: {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  image_url: string;
  link: string | null;
  status: EventStatus;
  thumbnail_url?: string | null;
  server_region?: string | null;
  view_count?: number | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}): EventItem {
  return {
    ...row,
    description: row.description.replace(SAMPLE_EVENT_TEXT_PATTERN, "").trim(),
    thumbnail_url: row.thumbnail_url ?? undefined,
    server_region: row.server_region ?? null,
    view_count: Number(row.view_count ?? 0),
    created_by_name: row.created_by_name ?? null,
    updated_by_name: row.updated_by_name ?? null,
  };
}

function parseInvitedEmails(rawValue?: string | null): InvitedEmailItem[] {
  if (!rawValue?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as InvitedEmailItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

      return parsed
      .filter((item) => typeof item?.email === "string" && typeof item?.created_at === "string")
      .map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        email: item.email.toLowerCase(),
        created_at: item.created_at,
        expires_at:
          typeof item.expires_at === "string" && item.expires_at
            ? item.expires_at
            : new Date(new Date(item.created_at).getTime() + INVITED_EMAIL_EXPIRATION_MS).toISOString(),
      }));
  } catch {
    return [];
  }
}

function sortInvitedEmails(items: InvitedEmailItem[]) {
  return [...items].sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at)));
}

function pruneExpiredInvitedEmails(items: InvitedEmailItem[]) {
  const now = Date.now();
  return items.filter((item) => new Date(item.expires_at).getTime() > now);
}

function pruneActiveAdmins(items: ActiveAdminItem[]) {
  const now = Date.now();
  return items.filter((item) => now - new Date(item.last_seen).getTime() <= ACTIVE_ADMIN_WINDOW_MS);
}

function pruneAdminActivityLogs(items: AdminActivityLogItem[]) {
  const now = Date.now();
  return items.filter((item) => now - new Date(item.created_at).getTime() <= ADMIN_ACTIVITY_RETENTION_MS);
}

export async function getEvents(query?: EventQuery): Promise<EventItem[]> {
  return withSupabaseReadFallback(
    "getEvents",
    () => applyEventQuery(getDemoStore().events, query),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []).map(mapEventRow);
      return applyEventQuery(rows, query);
    },
  );
}

export async function getEventById(id: string): Promise<EventItem | null> {
  return withSupabaseReadFallback(
    "getEventById",
    () => {
      const event = getDemoStore().events.find((item) => item.id === id);
      return event ? { ...event, status: normalizeEventStatus(event) } : null;
    },
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        return null;
      }
      const event = mapEventRow(data);
      return {
        ...event,
        status: normalizeEventStatus(event),
      };
    },
  );
}

export async function createEvent(
  payload: Omit<EventItem, "id"> & { id?: string },
): Promise<EventItem> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const event: EventItem = { ...payload, id: payload.id ?? crypto.randomUUID() };
    demo.events.unshift(event);
    return event;
  }

  const supabase = getSupabaseOrThrow();
  const fullPayload = {
    ...payload,
    id: payload.id ?? crypto.randomUUID(),
    thumbnail_url: payload.thumbnail_url ?? null,
    server_region: payload.server_region ?? null,
    link: payload.link ?? null,
    status: payload.status,
    view_count: 0,
    created_by_name: payload.created_by_name ?? null,
    updated_by_name: payload.created_by_name ?? null,
  };
  let result = await supabase
    .from("events")
    .insert(fullPayload as never)
    .select("*")
    .single();

  // Retry without optional columns if migration not run yet
  if (result.error && /created_by_name|updated_by_name|view_count|server_region/.test(result.error.message ?? "")) {
    console.warn("[events] thiếu cột, lưu bản rút gọn — chạy supabase/migration-event-server-region.sql:", result.error.message);
    const { created_by_name: _a, updated_by_name: _b, view_count: _c, server_region: _d, ...safePayload } = fullPayload as Record<string, unknown>;
    result = await supabase
      .from("events")
      .insert(safePayload as never)
      .select("*")
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapEventRow(result.data);
}

export async function updateEvent(
  id: string,
  payload: Partial<Omit<EventItem, "id">>,
): Promise<EventItem> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const index = demo.events.findIndex((event) => event.id === id);
    if (index < 0) {
      throw new Error("Event not found.");
    }
    demo.events[index] = { ...demo.events[index], ...payload };
    return demo.events[index];
  }

  const supabase = getSupabaseOrThrow();
  const updatePayload: Record<string, unknown> = {
    ...payload,
    thumbnail_url: payload.thumbnail_url ?? null,
    server_region: payload.server_region ?? null,
    link: payload.link ?? null,
    updated_by_name: payload.updated_by_name ?? null,
  };
  let result = await supabase
    .from("events")
    .update(updatePayload as never)
    .eq("id", id)
    .select("*")
    .single();
  if (result.error && /server_region/.test(result.error.message ?? "")) {
    console.warn("[events] thiếu cột server_region khi cập nhật — chạy supabase/migration-event-server-region.sql");
    const { server_region: _, ...safe } = updatePayload as Record<string, unknown>;
    result = await supabase
      .from("events")
      .update(safe as never)
      .eq("id", id)
      .select("*")
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapEventRow(result.data);
}

export async function deleteEvent(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    demo.events = demo.events.filter((event) => event.id !== id);
    return;
  }

  const supabase = getSupabaseOrThrow();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

// All NewsItem columns except the heavy `content` HTML body — used by list/ticker
// views that never render the body, so we avoid transferring it from the DB.
const NEWS_LIST_COLUMNS =
  "id, slug, title, excerpt, cover, category, status, created_at, created_by_name, scheduled_at";

export async function getNews(
  status: "all" | "published" | "draft" = "published",
  opts?: { includeContent?: boolean },
) {
  // Callers that only render cards/tickers pass includeContent:false to skip the
  // large `content` body (both from the DB query and the serialized payload).
  const includeContent = opts?.includeContent !== false;
  return withSupabaseReadFallback(
    "getNews",
    () =>
      applyNewsVisibility(getDemoStore().news, status)
        .map((item) => (includeContent ? item : { ...item, content: "" }))
        .sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at))),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const query = supabase
        .from("news")
        .select(includeContent ? "*" : NEWS_LIST_COLUMNS)
        .order("created_at", { ascending: false });
      const { data, error } =
        status === "all" ? await query : await query.eq("status", status as "draft" | "published");

      if (error) {
        throw new Error(error.message);
      }
      const rows = (data ?? []) as unknown as NewsItem[];
      return includeContent ? rows : rows.map((row) => ({ ...row, content: "" }));
    },
  );
}

type RelatedNews = Pick<
  NewsItem,
  "id" | "slug" | "title" | "cover" | "category" | "created_at" | "created_by_name" | "excerpt"
>;

// Fetches a few same-category published articles for the "related" rail on a news
// detail page — avoids loading every published article just to pick 3.
export async function getRelatedNews(
  category: string,
  excludeSlug: string,
  limit = 3,
): Promise<RelatedNews[]> {
  return withSupabaseReadFallback(
    "getRelatedNews",
    () =>
      getDemoStore()
        .news.filter(
          (n) => n.status === "published" && n.category === category && n.slug !== excludeSlug,
        )
        .sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at)))
        .slice(0, limit)
        .map(({ id, slug, title, cover, category, created_at, created_by_name, excerpt }) => ({
          id,
          slug,
          title,
          cover,
          category,
          created_at,
          created_by_name,
          excerpt,
        })),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, cover, category, created_at, created_by_name, excerpt")
        .eq("status", "published")
        .eq("category", category)
        .neq("slug", excludeSlug)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as unknown as RelatedNews[];
    },
  );
}

export async function getNewsBySlug(slug: string) {
  return withSupabaseReadFallback(
    "getNewsBySlug",
    () => getDemoStore().news.find((item) => item.slug === slug && item.status === "published"),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  );
}

export async function createNews(
  payload: Omit<NewsItem, "id" | "created_at"> & { id?: string; created_at?: string },
) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const item: NewsItem = {
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
      created_at: payload.created_at ?? new Date().toISOString(),
    };
    demo.news.unshift(item);
    return item;
  }

  const supabase = getSupabaseOrThrow();
  const insertPayload = {
    ...payload,
    id: payload.id ?? crypto.randomUUID(),
  };
  let result = await supabase
    .from("news")
    .insert(insertPayload as never)
    .select("*")
    .single();

  // Retry without created_by_name if that column doesn't exist yet
  if (result.error && /created_by_name/.test(result.error.message ?? "")) {
    const { created_by_name: _omit, ...safePayload } = insertPayload as Record<string, unknown>;
    result = await supabase
      .from("news")
      .insert(safePayload as never)
      .select("*")
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export async function updateNews(
  id: string,
  payload: Partial<Omit<NewsItem, "id">>,
) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const index = demo.news.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new Error("News not found.");
    }
    demo.news[index] = { ...demo.news[index], ...payload };
    return demo.news[index];
  }

  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("news")
    .update(payload as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function deleteNews(id: string) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    demo.news = demo.news.filter((item) => item.id !== id);
    return;
  }

  const supabase = getSupabaseOrThrow();
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  return withSupabaseReadFallback(
    "getGalleryItems",
    () =>
      [...getDemoStore().gallery].sort((a, b) =>
        compareDesc(new Date(a.created_at), new Date(b.created_at)),
      ),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  );
}

export async function createGalleryItem(
  payload: Omit<GalleryItem, "id" | "created_at"> & { id?: string },
) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const item: GalleryItem = {
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    demo.gallery.unshift(item);
    return item;
  }

  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("gallery")
    .insert({
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
    } as never)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function deleteGalleryItem(id: string) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    demo.gallery = demo.gallery.filter((item) => item.id !== id);
    return;
  }

  const supabase = getSupabaseOrThrow();
  const { error } = await supabase.from("gallery").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getUsers(): Promise<UserItem[]> {
  return withSupabaseReadFallback(
    "getUsers",
    () => getDemoStore().users,
    async () => {
      const adminClient = createAdminSupabaseClient();
      if (!adminClient) {
        return getDemoStore().users;
      }
      const { data, error } = await adminClient.from("users").select("*").order("created_at");
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map(normalizeUserItem);
    },
  );
}

export async function getUserByEmail(email: string): Promise<UserItem | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!hasSupabaseEnv) {
    return getDemoStore().users.find((user) => user.email === normalizedEmail) ?? null;
  }

  const supabase = getSupabaseAdminOrThrow();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUserItem(data) : null;
}

export async function updateUserInfo(
  id: string,
  data: { display_name?: string; email?: string; bio?: string; phone?: string },
): Promise<UserItem> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const idx = demo.users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("User not found.");
    if (data.display_name !== undefined) demo.users[idx].display_name = data.display_name;
    if (data.email !== undefined) demo.users[idx].email = data.email;
    return demo.users[idx];
  }

  const supabase = getSupabaseAdminOrThrow();

  if (data.email) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email: data.email });
    if (authErr) throw new Error(authErr.message);
  }

  const updates: Record<string, string | null> = {};
  if (data.display_name !== undefined) updates.display_name = data.display_name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.bio !== undefined) updates.bio = data.bio || null;
  if (data.phone !== undefined) updates.phone = data.phone || null;

  const { data: updated, error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeUserItem(updated as Partial<UserItem>);
}

export async function updateUserRole(id: string, role: UserRole) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const index = demo.users.findIndex((user) => user.id === id);
    if (index < 0) {
      throw new Error("User not found.");
    }
    demo.users[index].role = role;
    return demo.users[index];
  }

  const supabase = getSupabaseAdminOrThrow();
  const { data, error } = await supabase
    .from("users")
    .update({ role } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return normalizeUserItem(data as Partial<UserItem>);
}

/**
 * Ghi đè toàn bộ danh sách nhãn hiển thị của user. Nhãn KHÔNG cấp quyền —
 * việc ai được gán nhãn nào do API kiểm tra (xem canAssignBadge).
 */
export async function updateUserBadges(id: string, badges: string[]): Promise<UserItem> {
  const clean = normalizeBadges(badges);

  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const idx = demo.users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("User not found.");
    demo.users[idx].badges = clean;
    return demo.users[idx];
  }

  const supabase = getSupabaseAdminOrThrow();
  const { data, error } = await supabase
    .from("users")
    .update({ badges: clean } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeUserItem(data as Partial<UserItem>);
}

export async function deleteUser(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    demo.users = demo.users.filter((user) => user.id !== id);
    return;
  }

  const supabase = getSupabaseAdminOrThrow();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function banUser(id: string, banned: boolean): Promise<UserItem> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const idx = demo.users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("User not found.");
    demo.users[idx].is_banned = banned;
    return demo.users[idx];
  }

  const supabase = getSupabaseAdminOrThrow();
  await supabase.auth.admin.updateUserById(id, {
    ban_duration: banned ? "87600h" : "none",
  });
  const { data, error } = await supabase
    .from("users")
    .update({ is_banned: banned } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeUserItem(data as Partial<UserItem>);
}

export async function updateUserIsVerified(id: string, is_verified: boolean): Promise<UserItem> {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const idx = demo.users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("User not found.");
    demo.users[idx].is_verified = is_verified;
    return demo.users[idx];
  }

  const supabase = getSupabaseAdminOrThrow();
  const { data, error } = await supabase
    .from("users")
    .update({ is_verified } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeUserItem(data as Partial<UserItem>);
}

const ADMIN_PROFILE_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support"];
const PROFILE_SELECT_FULL = "id, display_name, avatar_url, role, badges, is_verified, created_at, bio, facebook_url, tiktok_url, instagram_url, youtube_url, website_url, last_seen_at, show_in_team, points, rank, team_title, team_duties, team_focus, team_order";
const PROFILE_SELECT_SAFE = "id, display_name, avatar_url, role, is_verified, created_at, bio, facebook_url, tiktok_url, instagram_url, youtube_url, website_url";

export async function getAdminProfiles(): Promise<PublicUserProfile[]> {
  if (!hasSupabaseEnv) {
    return getDemoStore().users
      .filter((u) => ADMIN_PROFILE_ROLES.includes(u.role as UserRole))
      .map((u) => ({
        id: u.id,
        display_name: u.display_name,
        avatar_url: u.avatar_url ?? null,
        role: u.role,
        is_verified: u.is_verified ?? false,
        created_at: u.created_at,
        show_in_team: true,
      }));
  }
  const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
  const client = supabase as ReturnType<typeof getSupabaseReadClientOrThrow>;

  // Try full select with show_in_team filter; fall back if migration columns missing
  let result = await client
    .from("users")
    .select(PROFILE_SELECT_FULL)
    .in("role", ADMIN_PROFILE_ROLES)
    .eq("is_banned", false)
    .eq("show_in_team", true)
    .order("created_at", { ascending: true }) as { data: PublicUserProfile[] | null; error: { message?: string } | null };

  if (result.error) {
    // Migration columns not present — fall back to safe set, return all admins
    result = await client
      .from("users")
      .select(PROFILE_SELECT_SAFE)
      .in("role", ADMIN_PROFILE_ROLES)
      .eq("is_banned", false)
      .order("created_at", { ascending: true }) as { data: PublicUserProfile[] | null; error: { message?: string } | null };
  }

  return (result.data ?? []).map((row) => ({
    ...row,
    role: normalizeRole(row.role),
    badges: normalizeBadges((row as { badges?: unknown }).badges),
    team_duties: normalizeDuties((row as { team_duties?: unknown }).team_duties),
    is_verified: Boolean(row.is_verified),
  }));
}

export async function getAllStaffProfiles(): Promise<PublicUserProfile[]> {
  if (!hasSupabaseEnv) return [];
  const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
  const client = supabase as ReturnType<typeof getSupabaseReadClientOrThrow>;

  let result = await client
    .from("users")
    .select(PROFILE_SELECT_FULL)
    .in("role", ADMIN_PROFILE_ROLES)
    .eq("is_banned", false)
    .order("created_at", { ascending: true }) as { data: PublicUserProfile[] | null; error: { message?: string } | null };

  if (result.error) {
    result = await client
      .from("users")
      .select(PROFILE_SELECT_SAFE)
      .in("role", ADMIN_PROFILE_ROLES)
      .eq("is_banned", false)
      .order("created_at", { ascending: true }) as { data: PublicUserProfile[] | null; error: { message?: string } | null };
  }

  return (result.data ?? []).map((row) => ({
    ...row,
    role: normalizeRole(row.role),
    badges: normalizeBadges((row as { badges?: unknown }).badges),
    team_duties: normalizeDuties((row as { team_duties?: unknown }).team_duties),
    is_verified: Boolean(row.is_verified),
  }));
}

export async function getUserPublicProfile(id: string): Promise<PublicUserProfile | null> {
  if (!hasSupabaseEnv) {
    const user = getDemoStore().users.find((u) => u.id === id);
    if (!user) return null;
    return { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url ?? null, role: user.role, is_verified: user.is_verified ?? false, created_at: user.created_at };
  }
  const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
  const client = supabase as ReturnType<typeof getSupabaseReadClientOrThrow>;

  // Cho phép /u/<handle> — nếu id không phải UUID thì tra theo cột handle.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const col = isUuid ? "id" : "handle";
  const val = isUuid ? id : id.toLowerCase();

  let result = await client
    .from("users")
    .select("id, handle, display_name, avatar_url, banner_url, role, badges, is_verified, created_at, bio, phone, contact_email, facebook_url, tiktok_url, instagram_url, youtube_url, website_url, discord_url, twitch_url, twitter_url, telegram_url, zalo_url, threads_url, github_url, game_profiles, last_seen_at, points, rank, views, privacy")
    .eq(col, val)
    .maybeSingle() as { data: PublicUserProfile | null; error: { message?: string } | null };

  if (result.error) {
    // Fallback: cột handle/mới chưa migrate → chỉ tra được theo UUID.
    if (!isUuid) return null;
    result = await client
      .from("users")
      .select("id, display_name, avatar_url, role, is_verified, created_at, bio, phone, facebook_url, tiktok_url, instagram_url, youtube_url, website_url")
      .eq("id", id)
      .maybeSingle() as { data: PublicUserProfile | null; error: { message?: string } | null };
  }

  if (!result.data) return null;
  const role = normalizeRole(result.data.role);
  return {
    ...result.data,
    role,
    badges: normalizeBadges(result.data.badges),
    is_verified: Boolean(result.data.is_verified),
  };
}

export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  if (!hasSupabaseEnv) throw new Error("Supabase required.");
  const supabase = getSupabaseAdminOrThrow();
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  const tempPassword = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  const { error } = await supabase.auth.admin.updateUserById(id, { password: tempPassword });
  if (error) throw new Error(error.message);
  return { tempPassword };
}

// Các key là JSON blob phình to theo thời gian (nhật ký lượt xem, danh sách IP
// khách). Trang công khai không bao giờ đọc chúng, nhưng select("*") vẫn kéo cả
// megabyte về mỗi lần render → tốn CPU parse + băng thông. Ai cần thì gọi
// getSettingsByKeys() để lấy đúng key đó.
export const BULKY_SETTING_KEYS = [
  "security.visitor_ips",
  "analytics.daily_views",
] as const;

// Cache sống xuyên request trong cùng một máy Fluid. React cache() chỉ gộp được
// các lời gọi trong CÙNG một request; settings thì gần như không đổi nên đọc lại
// từ Supabase mỗi request là lãng phí lớn nhất của Active CPU.
const SETTINGS_TTL_MS = 60_000;
let settingsMemo: { rows: SiteSetting[]; expires: number } | null = null;

export function invalidateSettingsCache() {
  settingsMemo = null;
}

// Wrapped in React cache() so multiple callers within one request/render
// (e.g. the homepage's own getSettings() + getStreams()/getStreamCategories()
// which call it internally) share a single fetch + decrypt pass instead of
// hitting Supabase and decrypting sensitive keys once per call.
export const getSettings = cache(async function getSettings(): Promise<SiteSetting[]> {
  const now = Date.now();
  if (settingsMemo && now < settingsMemo.expires) {
    return settingsMemo.rows;
  }

  // Chỉ ghi nhớ khi đọc THẬT SỰ thành công. Nếu Supabase lỗi/timeout mà vẫn
  // cache bản dự phòng thì cả site hiển thị cấu hình mặc định suốt 60 giây.
  let ok = false;
  const rows = await withSupabaseReadFallback(
    "getSettings",
    () => getDemoStore().settings,
    async () => {
      // Prefer admin client (bypasses RLS); fall back to read client if unavailable
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await (supabase as ReturnType<typeof getSupabaseReadClientOrThrow>)
        .from("settings")
        .select("*")
        .not("key", "in", `(${BULKY_SETTING_KEYS.join(",")})`)
        .order("key");
      if (error) {
        throw new Error(error.message);
      }
      const rows = (data ?? []) as SiteSetting[];
      const decrypted = await Promise.all(
        rows.map(async (row) =>
          isSensitiveKey(row.key)
            ? { ...row, value: await decryptSetting(row.value) }
            : row,
        ),
      );
      ok = true;
      return decrypted;
    },
  );

  if (ok) settingsMemo = { rows, expires: Date.now() + SETTINGS_TTL_MS };
  return rows;
});

// Lấy đúng vài key cần dùng — dành cho route ghi đếm/nhật ký, khỏi kéo cả bảng.
export async function getSettingsByKeys(keys: string[]): Promise<SiteSetting[]> {
  if (keys.length === 0) return [];
  return withSupabaseReadFallback(
    "getSettingsByKeys",
    () => getDemoStore().settings.filter((s) => keys.includes(s.key)),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await (supabase as ReturnType<typeof getSupabaseReadClientOrThrow>)
        .from("settings")
        .select("*")
        .in("key", keys);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as SiteSetting[];
      return Promise.all(
        rows.map(async (row) =>
          isSensitiveKey(row.key)
            ? { ...row, value: await decryptSetting(row.value) }
            : row,
        ),
      );
    },
  );
}

export async function getInvitedEmails(): Promise<InvitedEmailItem[]> {
  const settings = await getSettings();
  const invited = settings.find((item) => item.key === INVITED_EMAILS_SETTING_KEY);
  const parsedInvitedEmails = parseInvitedEmails(invited?.value);
  const nextItems = sortInvitedEmails(pruneExpiredInvitedEmails(parsedInvitedEmails));

  // Chỉ update nếu có email hết hạn bị prune, dùng fire-and-forget để tránh đệ quy
  if (nextItems.length !== parsedInvitedEmails.length) {
    void updateSetting(INVITED_EMAILS_SETTING_KEY, JSON.stringify(nextItems)).catch(() => null);
  }

  return nextItems;
}

export async function addInvitedEmail(email: string): Promise<InvitedEmailItem> {
  const normalizedEmail = email.trim().toLowerCase();
  const current = await getInvitedEmails();
  const existing = current.find((item) => item.email === normalizedEmail);
  if (existing) {
    return existing;
  }

  const nextItem: InvitedEmailItem = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + INVITED_EMAIL_EXPIRATION_MS).toISOString(),
  };

  await updateSetting(INVITED_EMAILS_SETTING_KEY, JSON.stringify([...current, nextItem]));
  return nextItem;
}

export async function removeInvitedEmail(id: string): Promise<void> {
  const current = await getInvitedEmails();
  const nextItems = current.filter((item) => item.id !== id);
  await updateSetting(INVITED_EMAILS_SETTING_KEY, JSON.stringify(nextItems));
}

export async function consumeInvitedEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const current = await getInvitedEmails();
  const nextItems = current.filter((item) => item.email !== normalizedEmail);
  await updateSetting(INVITED_EMAILS_SETTING_KEY, JSON.stringify(nextItems));
}

export function isEmailInvited(email: string, invitedEmails: InvitedEmailItem[]) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  return invitedEmails.some(
    (item) => item.email === normalizedEmail && new Date(item.expires_at).getTime() > now,
  );
}

export async function createDemoUser(email: string): Promise<UserItem> {
  const demo = getDemoStore();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = demo.users.find((item) => item.email === normalizedEmail);
  if (existing) {
    return existing;
  }

  const nextUser: UserItem = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    display_name: null,
    role: "user",
    views: 0,
    is_banned: false,
    created_at: new Date().toISOString(),
  };

  demo.users.unshift(nextUser);
  return nextUser;
}

export async function ensureUserAccount(input: {
  id: string;
  email: string;
  role?: UserRole;
}): Promise<UserItem> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const role = input.role ?? "user";

  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const existing = demo.users.find((item) => item.email === normalizedEmail || item.id === input.id);
    if (existing) {
      existing.email = normalizedEmail;
      existing.role = existing.role ?? role;
      return existing;
    }

    const nextUser: UserItem = {
      id: input.id,
      email: normalizedEmail,
      display_name: null,
      role,
      views: 0,
      is_banned: false,
      created_at: new Date().toISOString(),
    };
    demo.users.unshift(nextUser);
    return nextUser;
  }

  const supabase = getSupabaseAdminOrThrow();

  // First check if user already exists — preserve existing role
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (existing) {
    // Update email only, preserve existing role
    const { data, error } = await supabase
      .from("users")
      .update({ email: normalizedEmail } as never)
      .eq("id", input.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeUserItem(data ?? existing as Partial<UserItem>);
  }

  // Insert new user with default role
  const { data, error } = await supabase
    .from("users")
    .insert(
      {
        id: input.id,
        email: normalizedEmail,
        role,
      } as never,
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeUserItem(data as Partial<UserItem>);
}

export async function getActiveAdmins(): Promise<ActiveAdminItem[]> {
  const demo = getDemoStore();
  demo.activeAdmins = pruneActiveAdmins(demo.activeAdmins);
  return [...demo.activeAdmins].sort((a, b) => compareDesc(new Date(a.last_seen), new Date(b.last_seen)));
}

export async function markAdminActive(email: string, userId?: string): Promise<ActiveAdminItem[]> {
  const demo = getDemoStore();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const activeAdmins = pruneActiveAdmins(demo.activeAdmins);
  const existing = activeAdmins.find((item) => item.email === normalizedEmail);

  if (existing) {
    existing.last_seen = now;
  } else {
    activeAdmins.unshift({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      last_seen: now,
    });
  }

  demo.activeAdmins = activeAdmins;

  if (hasSupabaseEnv && userId) {
    try {
      const supabase = createAdminSupabaseClient();
      if (supabase) {
        await supabase.from("users").update({ last_seen_at: now } as never).eq("id", userId);
      }
    } catch { /* non-critical */ }
  }

  return getActiveAdmins();
}

export async function getNewsAdmin(): Promise<NewsItem[]> {
  return withSupabaseReadFallback(
    "getNewsAdmin",
    () => [...getDemoStore().news].sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at))),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  );
}

export async function getEventsAdmin(): Promise<EventItem[]> {
  return withSupabaseReadFallback(
    "getEventsAdmin",
    () => getDemoStore().events.map((e) => ({ ...e, status: normalizeEventStatus(e) })),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventRow);
    },
  );
}

export async function getGalleryAdmin(): Promise<GalleryItem[]> {
  return withSupabaseReadFallback(
    "getGalleryAdmin",
    () => [...getDemoStore().gallery].sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at))),
    async () => {
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  );
}

export async function updateSetting(key: string, value: string) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    const found = demo.settings.find((item) => item.key === key);
    if (found) {
      found.value = value;
      found.updated_at = new Date().toISOString();
      return found;
    }

    const next: SiteSetting = {
      id: crypto.randomUUID(),
      key,
      value,
      updated_at: new Date().toISOString(),
    };
    demo.settings.push(next);
    return next;
  }

  const supabase = getSupabaseAdminOrThrow();
  const storedValue = isSensitiveKey(key) && value ? await encryptSetting(value) : value;
  // upsert().select() lấy luôn row vừa ghi trong MỘT lượt đi — trước đây upsert
  // xong còn select lại, tức mỗi lần ghi settings tốn 2 vòng mạng.
  const { data: fetched, error } = await supabase
    .from("settings")
    .upsert(
      ({ key, value: storedValue, updated_at: new Date().toISOString() } as never),
      { onConflict: "key" },
    )
    .select()
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  invalidateSettingsCache();
  return (fetched ?? null) as SiteSetting | null;
}

export async function getAdminActivityLogs(): Promise<AdminActivityLogItem[]> {
  return withSupabaseReadFallback(
    "getAdminActivityLogs",
    () => {
      const demo = getDemoStore();
      demo.adminActivityLogs = pruneAdminActivityLogs(demo.adminActivityLogs);
      return [...demo.adminActivityLogs].sort((a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at)));
    },
    async () => {
      const adminSupabase = createAdminSupabaseClient();
      if (adminSupabase) {
        await adminSupabase
          .from("admin_activity_logs")
          .delete()
          .lt("created_at", new Date(Date.now() - ADMIN_ACTIVITY_RETENTION_MS).toISOString());
      }
      const supabase = adminSupabase ?? getSupabaseReadClientOrThrow();
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  );
}

export async function createAdminActivityLog(
  payload: Omit<AdminActivityLogItem, "id" | "created_at"> & { id?: string; created_at?: string },
) {
  if (!hasSupabaseEnv) {
    const demo = getDemoStore();
    demo.adminActivityLogs = pruneAdminActivityLogs(demo.adminActivityLogs);

    const nextItem: AdminActivityLogItem = {
      id: payload.id ?? crypto.randomUUID(),
      actor_email: payload.actor_email,
      action: payload.action,
      target_type: payload.target_type,
      target_id: payload.target_id ?? null,
      summary: payload.summary,
      ip: payload.ip ?? null,
      created_at: payload.created_at ?? new Date().toISOString(),
    };

    demo.adminActivityLogs.unshift(nextItem);
    return nextItem;
  }

  const supabase = getSupabaseAdminOrThrow();
  await supabase
    .from("admin_activity_logs")
    .delete()
    .lt("created_at", new Date(Date.now() - ADMIN_ACTIVITY_RETENTION_MS).toISOString());

  const fullLog = {
    ...payload,
    id: payload.id ?? crypto.randomUUID(),
    created_at: payload.created_at ?? new Date().toISOString(),
    target_id: payload.target_id ?? null,
  };
  let result = await supabase
    .from("admin_activity_logs")
    .insert(fullLog as never)
    .select("*")
    .single();

  // Retry without ip column if migration not run yet
  if (result.error && /column "ip"|ip/i.test(result.error.message ?? "") && /column/i.test(result.error.message ?? "")) {
    const { ip: _ip, ...safeLog } = fullLog as Record<string, unknown>;
    result = await supabase
      .from("admin_activity_logs")
      .insert(safeLog as never)
      .select("*")
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [users, events, news, settings] = await Promise.all([
    getUsers(),
    getEvents(),
    getNews("all"),
    // analytics.daily_views bị loại khỏi getSettings() nên phải hỏi thẳng.
    getSettingsByKeys(["analytics.views", "analytics.daily_views", "analytics.lifetime_views"]),
  ]);

  const viewsSetting = settings.find((item) => item.key === "analytics.views");
  const dailySetting = settings.find((item) => item.key === "analytics.daily_views");
  const lifetimeSetting = settings.find((item) => item.key === "analytics.lifetime_views");
  const fallbackViews = users.reduce((acc, user) => acc + user.views, 0);

  // Take the MAX of all available counters to never show a drop if any one
  // counter was accidentally reset. analytics.lifetime_views is monotonic
  // and is the most reliable source going forward.
  const archived = viewsSetting ? Number(viewsSetting.value) || 0 : 0;
  let dailyTotal = 0;
  if (dailySetting?.value) {
    try {
      const daily = JSON.parse(dailySetting.value) as Record<string, number>;
      dailyTotal = Object.values(daily).reduce((sum, v) => sum + (Number(v) || 0), 0);
    } catch { /* ignore */ }
  }
  const lifetime = lifetimeSetting ? Number(lifetimeSetting.value) || 0 : 0;
  const archivedPlusDaily = archived + dailyTotal;

  // Use whichever is the largest — protects against accidental data loss
  let views = Math.max(lifetime, archivedPlusDaily, fallbackViews);

  return {
    users: users.length,
    events: events.length,
    news: news.length,
    views: Number.isFinite(views) ? views : fallbackViews,
  };
}
