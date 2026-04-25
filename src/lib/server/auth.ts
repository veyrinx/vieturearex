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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, role: "user", bypass: false };
  }

  // Always fetch role from DB — never trust app_metadata which can be stale
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

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile?.role ?? "user",
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
}
