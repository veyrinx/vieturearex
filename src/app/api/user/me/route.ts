import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const EDIT_ROLES = new Set(["super_admin", "admin", "it"]);
const ADMIN_ROLES = new Set(["super_admin", "admin", "it", "manager", "support"]);

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-me", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv) {
    return NextResponse.json({ role: null, isAdmin: false, canEdit: false });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ role: null, isAdmin: false, canEdit: false });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ role: null, isAdmin: false, canEdit: false });
  }

  const adminClient = createAdminSupabaseClient();
  const roleClient = (adminClient ?? supabase) as typeof supabase;

  const { data: profile } = await roleClient
    .from("users")
    .select("role, is_banned")
    .eq("id", user.id)
    .maybeSingle() as { data: { role: string; is_banned: boolean } | null };

  if (profile?.is_banned) {
    return NextResponse.json({ role: null, isAdmin: false, canEdit: false });
  }

  const appMetaRole = (user.app_metadata?.role as string | undefined) ?? null;
  const role = profile?.role ?? (ADMIN_ROLES.has(appMetaRole ?? "") ? appMetaRole : null);

  return NextResponse.json(
    {
      role,
      isAdmin: ADMIN_ROLES.has(role ?? ""),
      canEdit: EDIT_ROLES.has(role ?? ""),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
