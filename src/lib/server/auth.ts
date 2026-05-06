import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { UserRole } from "@/lib/types/content";

export type AuthContext = {
  userId: string | null;
  email: string | null;
  role: UserRole;
  bypass: boolean;
};

const VALID_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support", "user"];

export async function getAuthContext(): Promise<AuthContext> {
  if (!hasSupabaseEnv) {
    return { userId: null, email: null, role: "user", bypass: false };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { userId: null, email: null, role: "user", bypass: false };
  }

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    return { userId: null, email: null, role: "user", bypass: false };
  }

  // 1. Prefer admin client (bypasses RLS) — needs SUPABASE_SERVICE_ROLE_KEY
  // 2. Fall back to server client (subject to RLS — needs "Users read own profile" policy)
  // 3. Last resort: app_metadata.role (set by Supabase triggers/admin API)
  const adminClient = createAdminSupabaseClient();
  const roleClient = (adminClient ?? supabase) as typeof supabase;

  const { data: profile } = (await roleClient
    .from("users")
    .select("role, is_banned")
    .eq("id", user.id)
    .maybeSingle()) as { data: { role: UserRole; is_banned: boolean | null } | null };

  if (profile?.is_banned) {
    return { userId: user.id, email: user.email ?? null, role: "user", bypass: false };
  }

  const appMetaRole = user.app_metadata?.role as UserRole | undefined;
  const role: UserRole =
    profile?.role ??
    (appMetaRole && VALID_ROLES.includes(appMetaRole) ? appMetaRole : null) ??
    "user";

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    bypass: false,
  };
}

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support"];

export async function requireAdminAccess() {
  const auth = await getAuthContext();

  if (!auth.userId) {
    redirect("/auth/login?next=/admin");
  }

  if (!ADMIN_ROLES.includes(auth.role)) {
    redirect("/?error=unauthorized");
  }

  return auth;
}
