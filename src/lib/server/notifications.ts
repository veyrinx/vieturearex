import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_url: string | null;
  read_at: string | null;
  created_at: string;
};

export type CreateNotificationInput = {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  entity_url?: string;
};

function getDb() {
  const admin = createAdminSupabaseClient();
  if (admin) return admin;
  const sb = createServerSupabaseClient();
  if (!sb) throw new Error("DB unavailable");
  return sb;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const db = getDb();
    await untypedFrom(db, "notifications").insert(input);
  } catch {
    // Non-fatal — notifications are best-effort
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    const db = getDb();
    await untypedFrom(db, "notifications").insert(inputs);
  } catch {
    // Non-fatal
  }
}

export async function getUserNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const db = getDb();
  const { data, error } = await untypedFrom(db, "notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb();
  const { count, error } = await untypedFrom(db, "notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const db = getDb();
  await untypedFrom(db, "notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function markRead(notificationId: string, userId: string): Promise<void> {
  const db = getDb();
  await untypedFrom(db, "notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
}
