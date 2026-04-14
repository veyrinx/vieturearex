import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { UserRole } from "@/lib/types/content";

export type AuthContext = {
  userId: string | null;
  email: string | null;
  role: UserRole;
  bypass: boolean;
};

const VALID_ROLES: UserRole[] = ["super_admin", "admin", "manager", "support", "user"];

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

  const appRole = user.app_metadata?.role as UserRole | undefined;
  if (appRole && VALID_ROLES.includes(appRole)) {
    return { userId: user.id, email: user.email ?? null, role: appRole, bypass: false };
  }

  const { data: profile } = (await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()) as { data: { role: UserRole } | null };

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile?.role ?? "user",
    bypass: false,
  };
}

export async function requireAdminAccess() {
  const auth = await getAuthContext();

  if (!auth.userId) {
    redirect("/auth/login?next=/admin");
  }

  // Middleware đã check user có trong DB chưa, đây chỉ check session
  if (!auth.role) {
    redirect("/auth/login?error=google_not_allowed");
  }
}
