import "server-only";

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
  SiteSetting,
  UserItem,
  UserRole,
} from "@/lib/types/content";
import { getEventStatusInVietnam } from "@/lib/utils/vietnam-time";

type EventQuery = {
  search?: string;
  status?: EventStatus | "all";
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

  try {
    const timeoutMs = getSupabaseQueryTimeoutMs();
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Supabase read timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[content-service] ${label} fallback activated: ${message}`);
    return fallback();
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
      return matchSearch && matchStatus;
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

const VALID_USER_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support", "user"];

function normalizeUserItem(row: Partial<UserItem>): UserItem {
  const views = Number(row.views ?? 0);
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    display_name: row.display_name ?? null,
    role: VALID_USER_ROLES.includes(row.role as UserRole) ? (row.role as UserRole) : "user",
    views: Number.isFinite(views) ? views : 0,
    is_banned: Boolean(row.is_banned),
    is_verified: row.is_verified === true,
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
}): EventItem {
  return {
    ...row,
    description: row.description.replace(SAMPLE_EVENT_TEXT_PATTERN, "").trim(),
    thumbnail_url: row.thumbnail_url ?? undefined,
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
      const supabase = getSupabaseReadClientOrThrow();
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
      const supabase = getSupabaseReadClientOrThrow();
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
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
      thumbnail_url: payload.thumbnail_url ?? null,
      link: payload.link ?? null,
      status: payload.status,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return mapEventRow(data);
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
  const { data, error } = await supabase
    .from("events")
    .update({
      ...payload,
      thumbnail_url: payload.thumbnail_url ?? null,
      link: payload.link ?? null,
    } as never)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return mapEventRow(data);
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

export async function getNews(status: "all" | "published" | "draft" = "published") {
  return withSupabaseReadFallback(
    "getNews",
    () =>
      applyNewsVisibility(getDemoStore().news, status).sort((a, b) =>
        compareDesc(new Date(a.created_at), new Date(b.created_at)),
      ),
    async () => {
      const supabase = getSupabaseReadClientOrThrow();
      const query = supabase.from("news").select("*").order("created_at", { ascending: false });
      const { data, error } =
        status === "all" ? await query : await query.eq("status", status as "draft" | "published");

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  );
}

export async function getNewsBySlug(slug: string) {
  return withSupabaseReadFallback(
    "getNewsBySlug",
    () => getDemoStore().news.find((item) => item.slug === slug && item.status === "published"),
    async () => {
      const supabase = getSupabaseReadClientOrThrow();
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
  const { data, error } = await supabase
    .from("news")
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
      const supabase = getSupabaseReadClientOrThrow();
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
  data: { display_name?: string; email?: string },
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

  const updates: Record<string, string> = {};
  if (data.display_name !== undefined) updates.display_name = data.display_name;
  if (data.email !== undefined) updates.email = data.email;

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

export async function getSettings(): Promise<SiteSetting[]> {
  return withSupabaseReadFallback(
    "getSettings",
    () => getDemoStore().settings,
    async () => {
      // Prefer admin client (bypasses RLS); fall back to read client if unavailable
      const supabase = createAdminSupabaseClient() ?? getSupabaseReadClientOrThrow();
      const { data, error } = await (supabase as ReturnType<typeof getSupabaseReadClientOrThrow>)
        .from("settings")
        .select("*")
        .order("key");
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
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

export async function markAdminActive(email: string): Promise<ActiveAdminItem[]> {
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
  // Dùng upsert không có .single() để tránh lỗi "Cannot coerce result to single JSON object"
  const { error } = await supabase
    .from("settings")
    .upsert(
      ({ key, value, updated_at: new Date().toISOString() } as never),
      { onConflict: "key" },
    );
  if (error) {
    throw new Error(error.message);
  }
  // Fetch lại row sau upsert
  const { data: fetched } = await supabase
    .from("settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();
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

  const { data, error } = await supabase
    .from("admin_activity_logs")
    .insert({
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
      created_at: payload.created_at ?? new Date().toISOString(),
      target_id: payload.target_id ?? null,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [users, events, news, settings] = await Promise.all([
    getUsers(),
    getEvents(),
    getNews("all"),
    getSettings(),
  ]);

  const viewsSetting = settings.find((item) => item.key === "analytics.views");
  const fallbackViews = users.reduce((acc, user) => acc + user.views, 0);
  const views = viewsSetting ? Number(viewsSetting.value) : fallbackViews;

  return {
    users: users.length,
    events: events.length,
    news: news.length,
    views: Number.isFinite(views) ? views : fallbackViews,
  };
}
