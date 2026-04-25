import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { POINTS } from "@/lib/constants/ranks";
import { getSettings, updateSetting } from "@/lib/data/content-service";

const EDIT_ROLES = new Set(["super_admin", "admin", "it"]);
const ADMIN_ROLES = new Set(["super_admin", "admin", "it", "manager", "support"]);
const DAILY_LOGIN_KEY = "points.daily_login_log";

async function maybeAwardDailyLogin(userId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const settings = await getSettings();
    const raw = settings.find((s) => s.key === DAILY_LOGIN_KEY)?.value ?? "{}";
    let map: Record<string, string> = {};
    try { map = JSON.parse(raw); } catch { map = {}; }

    if (map[userId] === today) return; // already awarded today

    const admin = createAdminSupabaseClient();
    if (!admin) return;

    await (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: userId, amount: POINTS.DAILY_LOGIN });

    map[userId] = today;
    // Trim map to last 1000 entries to avoid unbounded growth
    const entries = Object.entries(map);
    if (entries.length > 1000) {
      const recent = entries.slice(-1000);
      map = Object.fromEntries(recent);
    }
    await updateSetting(DAILY_LOGIN_KEY, JSON.stringify(map));
  } catch { /* non-fatal */ }
}

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

  // Award daily login points (silent, non-blocking)
  void maybeAwardDailyLogin(user.id);

  return NextResponse.json(
    {
      role,
      isAdmin: ADMIN_ROLES.has(role ?? ""),
      canEdit: EDIT_ROLES.has(role ?? ""),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
