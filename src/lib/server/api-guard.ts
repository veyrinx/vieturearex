import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getClientIp } from "@/lib/server/get-client-ip";

export function getClientKey(request: NextRequest) {
  return getClientIp(request);
}

export { getClientIp };

export function enforceRateLimit(
  request: NextRequest,
  options: {
    name: string;
    limit?: number;
    windowMs?: number;
  },
) {
  const key = `${options.name}:${getClientKey(request)}`;
  const result = rateLimit(key, {
    limit: options.limit ?? 50,
    windowMs: options.windowMs ?? 60_000,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.retryAfter ?? 0) / 1000)),
        },
      },
    );
  }

  return null;
}

type MinimumRole = "super_admin" | "admin" | "it" | "manager" | "support" | "user";

const ROLE_HIERARCHY: Record<string, number> = {
  it: 150,
  super_admin: 100,
  admin: 80,
  manager: 60,
  support: 40,
  user: 20,
};

function matchesMinimumRole(role: string | null | undefined, minimumRole: MinimumRole) {
  if (!role) return false;
  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
}

export async function enforceAdminApiAuth(options?: { minimumRole?: MinimumRole }) {
  const minimumRole = options?.minimumRole ?? "support";

  // Production: Supabase authentication is REQUIRED
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase not configured (production requires authentication)" },
      { status: 500 }
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always verify against DB — never shortcut on app_metadata so role revocation takes effect immediately
  const { data: profile } = (await supabase
    .from("users")
    .select("role, is_banned")
    .eq("id", user.id)
    .maybeSingle()) as { data: { role: string; is_banned: boolean | null } | null };

  if (profile?.is_banned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  if (!matchesMinimumRole(profile?.role, minimumRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
